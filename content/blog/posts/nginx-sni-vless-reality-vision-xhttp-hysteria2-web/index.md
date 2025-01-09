---
title: 仅使用 443 端口完美配置 Nginx SNI 分流 REALITY&XHTTP、Hysteria 2 及 WEB 网站
date: 2024-12-17 22:34
tags: 
  - xray
  - reality
  - hysteria2
  - nginx
---
## 背景

[上一篇文章](https://tabsp.com/posts/vless-reality-vision)介绍了手动安装并配置 Xray 的 REALITY 协议，但是支持 REALITY 协议的 iOS 的客户端太少，所以打算同时安装一个 Hysteria 2 作为补充。目前来看 [Xray core 短期内不会支持 Hysteria 2](https://github.com/XTLS/Xray-core/issues/3547#issuecomment-2232800832)，故考虑使用 nginx 同时反代 Xray 和 Hysteria 2。

正如标题所言，这次我们上点强度，为了达到完美的效果，我们只使用一个 443 端口，实现 nginx 反代 Xray（支持 [REALITY](https://github.com/XTLS/REALITY)&[XHTTP](https://github.com/XTLS/Xray-core/discussions/4113)）和 [Hysteria 2](https://v2.hysteria.network)，同时再反代一个 WEB 网站，网站支持 HTTP/2 和 HTTP/3。

流程如下：

```
┌─────────────┐    ┌────────────────┐     ┌───────────────────┐
│ WEB browser │    │ REALITY client │     │ Hysteria 2 client │
└──────┬──────┘    └───────┬────────┘     └─────────┬─────────┘
       │                   │                        │
       │                   │                        │
       │                   │                        │
       │                   │                        │
       │          ┌────────▼────────┐               │
       └──────────► example.com:443 ◄───────────────┘
                  └────────┬────────┘
                           │
                           │
                       ┌───▼───┐
                       │ Nginx │
                       └───┬───┘
                           │
        ┌──────────────────┼────────────────────────┐
        │                  │                        │
  ┌─────▼──────┐    ┌──────▼───────┐     ┌──────────▼────────┐
  │ WEB server │    │ Xray server │     │ Hysteria 2 server │
  └────────────┘    └──────────────┘     └───────────────────┘
```

## 准备工作

- 一个域名，本文以 example.com 为例，注意自行替换下文所有配置文件中的域名为自己的域名
- 将 example.com 解析到自己主机，不要开启 CDN
- 和[上一篇文章](https://tabsp.com/posts/vless-reality-vision)一样，本文所有操作均基于 root 用户
- 一些耐心

## 安装

### 安装 Nginx

编译安装最新版本 Nginx

```bash
wget https://nginx.org/download/nginx-1.26.2.tar.gz

tar -zxvf nginx-1.26.2.tar.gz

cd nginx-1.26.2

apt install gcc make -y
apt install libpcre3 libpcre3-dev zlib1g zlib1g-dev libssl-dev -y

./configure --prefix=/usr/local/nginx --with-http_ssl_module --with-http_v2_module --with-http_v3_module --with-stream --with-stream_ssl_module --with-http_realip_module --with-stream_ssl_preread_module 

make && make install
```

设置 Nginx 开机启动，新建 `/etc/systemd/system/nginx.service`，文件内容如下

```
[Unit]
Description=The NGINX HTTP and reverse proxy server
After=syslog.target network-online.target remote-fs.target nss-lookup.target
After=xray.service

[Service]
Type=forking
ExecStartPre=/usr/local/nginx/sbin/nginx -t
ExecStart=/usr/local/nginx/sbin/nginx
ExecReload=/usr/local/nginx/sbin/nginx -s reload
ExecStop=/bin/kill -s QUIT $MAINPID
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

启动 Nginx 服务并将 nginx 加入 PATH：

```bash
echo "PATH=$PATH:/usr/local/nginx/sbin" >> ~/.bashrc
systemctl enable nginx
systemctl start nginx
```

### 安装 acme 并申请 https 证书

安装 acme 并申请证书，注意更换为自己邮箱并提前设置域名解析，另外还需要临时将默认 nginx 配置的 server_name 改为要申请证书的域名：

```bash
curl https://get.acme.sh | sh -s email=youremail@example.com
source ~/.bashrc
acme.sh --issue -d example.com --nginx /usr/local/nginx/conf/nginx.conf
```

安装证书：

```bash
mkdir -p /usr/local/nginx/certs/example.com

acme.sh --install-cert -d example.com \
--key-file       /usr/local/nginx/certs/example.com/cert.key  \
--fullchain-file /usr/local/nginx/certs/example.com/fullchain.cer
```

### 安装 Hysteria 2

使用官方脚本一键安装并设置开机启动（注意需要设置 root 为启动用户）：

```bash
HYSTERIA_USER=root bash <(curl -fsSL https://get.hy2.sh/)

systemctl enable hysteria-server
```

### 安装 Xray

参考 [上一篇文章](https://tabsp.com/posts/vless-reality-vision) 安装并设置自动更新 dat。

## 配置

端口规划：

| 端口 | 监听      | 协议   | 服务            | 作用                             |
|------|-----------|-------|-----------------|----------------------------------|
| 80   | 0.0.0.0   | HTTP  | Nginx           | 强制重定向至 443                  |
| 443  | 0.0.0.0   | TCP   | Nginx           | Xray、HTTP/2 WEB 服务入口         |
| 443  | 0.0.0.0   | UDP   | Nginx           | Hysteria 2、HTTP/3 WEB 服务入口   |
| 2024 | 127.0.0.1 | XHTTP | Xray            | Xray XHTTP 协议监听端口           |
| 3001 | 127.0.0.1 | HTTP  | Any WEB service | WEB 服务监听端口，搭建自己的服务    |
| 1443 | 127.0.0.1 | TCP   | Xray            | Xray REALITY 协议监听端口          |
| 2443 | 127.0.0.1 | UDP   | Hysteria 2      | Hysteria 2 监听端口                |
| 8443 | 127.0.0.1 | HTTP  | Nginx           | 反代 WEB 服务                     |

### 配置 Nginx

懒得解释了，自行问 ChatGPT 吧 :D

```conf
worker_processes  auto;

error_log  logs/error.log  notice;
pid        logs/nginx.pid;

events {
    worker_connections  1024;
}

stream {
    map $ssl_preread_server_name $backend_name {
        example.com reality_backend;
        default web_backend;
    }

    upstream reality_backend {
        server 127.0.0.1:1443;
    }

    upstream web_backend {
        server 127.0.0.1:8443;
    }

    upstream hysteria_backend {
        server 127.0.0.1:2443;
    }    

    server {
        listen 443;
        listen [::]:443;

        ssl_preread    on;
        proxy_pass     $backend_name;
        proxy_protocol on;
    }

    server {
        listen 443 udp reuseport;
        listen [::]:443 udp reuseport;

        proxy_pass    hysteria_backend;
        proxy_timeout 20s;
    }
}


http {
    server_tokens off;
    include       mime.types;
    default_type  application/octet-stream;
    
    map $http_x_forwarded_for $clientRealIp {
        "" $remote_addr;
        "~*(?P<firstAddr>([0-9a-f]{0,4}:){1,7}[0-9a-f]{1,4}|([0-9]{1,3}\.){3}[0-9]{1,3})$" $firstAddr;
    }

    log_format main '$clientRealIp $remote_addr $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" $http_x_forwarded_for '
                    '"$upstream_addr" "$upstream_status" "$upstream_response_time" "$request_time" ';
    access_log       logs/access.log  main;

    sendfile          on;
    keepalive_timeout 65;

    gzip       on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    server {
        listen 80;
        listen [::]:80;
        return 301 https://$host$request_uri;
    }

    server {
        listen 127.0.0.1:8443 quic reuseport;
        listen 127.0.0.1:8443 ssl proxy_protocol reuseport;

        http2 on;

        set_real_ip_from 127.0.0.1;
        real_ip_header   proxy_protocol;

        ssl_certificate     /usr/local/nginx/certs/example.com/fullchain.cer;
        ssl_certificate_key /usr/local/nginx/certs/example.com/cert.key;

        ssl_protocols             TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers               ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305;
        ssl_ecdh_curve            secp521r1:secp384r1:secp256r1:x25519;

        # 替换为自己 XHTTP 的路径，一般为随机字符串，对应下文中 Xray 的配置
        location /<replace-this> {
            grpc_pass grpc://127.0.0.1:2024;
            grpc_set_header Host $host;
            grpc_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location / {
            add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
            add_header Alt-Svc 'h3=":443"; ma=86400';

            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header   Host $host;
            proxy_pass         http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade $http_upgrade;
            proxy_set_header   Connection "upgrade";
        }
    }
}
```

### 配置 Xray

与[上一篇文章](https://tabsp.com/posts/vless-reality-vision)一样，将配置文件中的所有 `<replace-this>` 替换为自己的配置，不同之处在于这次 reality 回落域名使用的是自己的域名，俗称“自己偷自己”。

```json
{
  "log": {
    "loglevel": "warning",
    "error": "/var/log/xray/error.log",
    "access": "/var/log/xray/access.log" 
  },
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "type": "field",
        "protocol": [
            "bittorrent"
        ],
        "outboundTag": "block"
      },
      {
        "type": "field",
        "ip": [
            "geoip:private"
        ],
        "outboundTag": "block"
      },
      {
        "type": "field",
        "ip": [
            "geoip:cn"
        ],
        "outboundTag": "block"
      },
      {
        "type": "field",
        "domain": [
            "geosite:category-ads-all"
        ],
        "outboundTag": "block"
      }
    ]
  },
  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 1443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "<replace-this>", // 可以使用 xray uuid 生成，注意保存
            "flow": "xtls-rprx-vision"
          }
        ],
        "decryption": "none",
        "fallbacks": [
          {
            "dest": 2024
          }
        ]
      },
      "streamSettings": {
        "network": "raw",
        "security": "reality",
        "realitySettings": {
          "target": 8443,
          "xver": 1,
          "serverNames": [
            "<replace-this>" // 设置客户端可用的 server name 列表，设置为你自己域名 example.com
          ],
          "privateKey": "<replace-this>", // 可以使用 xray x25519 生成
          "shortIds": [
            ""
          ]
        },
        "rawSettings": {
          "acceptProxyProtocol": true
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": [
          "http",
          "tls",
          "quic"
        ]
      }
    },
    {
      "listen": "127.0.0.1",
      "port": 2024,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "<replace-this>" // 可以使用 xray uuid 生成，注意保存
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "xhttp",
        "xhttpSettings": {
          "path": "<replace-this>" // 随便输入一个路径，随机字符串即可，注意替换 Nginx 中的反代配置
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": [
          "http",
          "tls",
          "quic"
        ]
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "tag": "block"
    }
  ]
}
```

### 配置 Hysteria 2

证书复用前文中使用 acme 申请到的证书，并将 Hysteria 2 的伪装（masquerade）设置为自己的网站 `https://example.com/`，端口跳跃自行查阅官方文档开启。

这里多说一句，Hysteria 2 的伪装原理就是将自己伪装为成标准的 HTTP/3 流量，认证成功流量会通过 Hysteria 2，认证失败就会走伪装的网站。

```yaml
listen: 127.0.0.1:2443

tls:
  cert: /usr/local/nginx/certs/example.com/fullchain.cer
  key: /usr/local/nginx/certs/example.com/cert.key

auth:
  type: password
  password: "<replace-this>", # 密码，可以使用 xray uuid 生成，注意保存

masquerade:
  type: proxy
  proxy:
    url: https://example.com/
    rewriteHost: true
```

配置成功后你会发现当启动 `hysteria-server` 后使用浏览器访问你的网站 `https://example.com/` 会显示协议为 h3，关闭 `hysteria-server` 后再访问网站协议就会变为 h2。

## 重启所有服务

完成配置后重启所有服务，并检查服务状态和日志是否正常。

```bash
systemctl restart nginx
systemctl restart hysteria-server
systemctl restart xray
```

以上，祝你成功。
