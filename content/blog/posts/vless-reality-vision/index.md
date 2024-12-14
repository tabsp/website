---
title: 手动配置 X-ray（vless+reality+vision）代理服务器
date: 2024-12-14 22:41
tags: 
  - x-ray
---
## 依赖

- curl
- vim

本文所有操作均基于 root 用户。

## 安装

[安装 X-ray](https://github.com/XTLS/Xray-install)

```bash
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install
```

## 配置

### X-ray 配置

使用 vim 修改 X-ray 默认配置文件，默认路径在 `/usr/local/etc/xray/config.json`，默认内容为 `{}`。

```bash
vim /usr/local/etc/xray/config.json
```

参考配置：

```json
{
    "log": {
        "loglevel": "warning"
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
            "tag": "xray-xtls-reality",
            "listen": "0.0.0.0",
            "port": 443,
            "protocol": "vless",
            "settings": {
                "clients": [
                    {
                        "id": "<replace-this>", // 可以使用 xray uuid 生成，注意保存
                        "flow": "xtls-rprx-vision"
                    }
                ],
                "decryption": "none"
            },
            "streamSettings": {
                "network": "tcp",
                "security": "reality",
                "realitySettings": {
                    "dest": "<replace-this>", // 自行设置合适的回落域名，必须带端口，比如：www.example.com:443
                    "serverNames": [
                        "<replace-this>" // 自行设置客户端可用的 server name 列表，例如：www.example.com
                    ],
                    "privateKey": "<replace-this>", // 可以使用 xray x25519 生成
                    "shortIds": [
                        ""
                    ]
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

参考配置中的 `<replace-this>` 必须替换并修改为自己的配置，替换方法参考注释，其他例如 shortIds、流量过滤等可以自行决定是否配置。

参考配置支持的特性：

1. 使用 reality 协议；
2. 开启 vision 分流；
3. 禁用 bittorrent、广告、回国等流量；

### 替换并自动更新 dat

创建更新脚本：

```bash
# 创建脚本文件夹
mkdir /usr/local/etc/xray-script
# 打开并编辑更新脚本
vim /usr/local/etc/xray-script/update-dat.sh
```

脚本内容：

```bash
#!/usr/bin/env bash

set -e

XRAY_DIR="/usr/local/share/xray"

GEOIP_URL="https://github.com/Loyalsoldier/v2ray-rules-dat/raw/release/geoip.dat"
GEOSITE_URL="https://github.com/Loyalsoldier/v2ray-rules-dat/raw/release/geosite.dat"

[ -d $XRAY_DIR ] || mkdir -p $XRAY_DIR
cd $XRAY_DIR

curl -L -o geoip.dat.new $GEOIP_URL
curl -L -o geosite.dat.new $GEOSITE_URL

rm -f geoip.dat geosite.dat

mv geoip.dat.new geoip.dat
mv geosite.dat.new geosite.dat

systemctl -q is-active xray && systemctl restart xray
```

赋予可执行权限：

```bash
chmod +x /usr/local/etc/xray-script/update-dat.sh
```

可以输入以下命令先手动执行一次：

```bash
/usr/local/etc/xray-script/update-dat.sh
```


确认没有问题后使用 crontab 设置定期执行：

1. 执行 `crontab -e`；
2. 选择使用 vim 打开；
3. 在文件末尾追加 `00 23 * * 1 /usr/local/etc/xray-script/update-dat.sh >/dev/null 2>&1`

说明：可自行决定更新时间，示例中为每周一 23 点执行（注意服务器时区）。

## 回落域名的选择

### 基本要求

根据 [reality 文档](https://github.com/XTLS/REALITY) 的说明回落域名的网站需要满足以下要求：

1. 国外网站，网站服务器在国外且未被 GFW 屏蔽，越靠近代理服务越好（伪装效果更好，延迟也更低）；
2. 支持 TLSv1.3 与 H2；
3. 域名非跳转用；

**另外需要注意的是，不要选择套了 Cloudflare CDN 的网站，有被其他人当作中转服务器的风险。**

一般来讲回落域名选择有以下几种选择：

1. 海外大厂的域名，例如 Microsoft、Apple 等；
2. 代理服务器的当地网站，例如当地大学、旅游局等机构的网站；
3. 自己网上邻居的网站；
4. 自己的网站；

**除选择 1 不推荐以外，其他选择可以自行决定使用哪种，本文以选择 3 为例。**

### 找到网上邻居的网站

分为以下几步：

1. 使用 [ASN 查询工具](https://tools.ipip.net/as.php)查询代理服务器的 ASN；
2. 使用 [FOFA](https://fofa.info) 查找符合条件的网站，查询条件为 `asn=="<replace-this>" && country=="US" && port=="443" && cert!="Let's Encrypt" && cert.issuer!="ZeroSSL" && status_code="200"`；
3. 逐个验证查询到的网站是否满足回落域名的要求（使用浏览器的开发人员工具验证）；

注意：需要将 FOFA 查询条件中的 `<replace-this>` 替换为你代理服务器的 ASN，一定要用浏览器打开网站验证，确保能正常打开，是正规网站且满足回落域名要求。

TLS 版本可以打开开发人员工具后在 Security 选项卡中查看；是否支持 H2 可以在 Network 选项卡中查看 Protocol 列（默认未勾选）或者使用[在线网站](https://domsignal.com/http2-test)检测。

## 客户端配置

以 mihomo 内核配置为例：

```yaml
proxies:
- name: "node1"
  type: vless
  server: <replace-this> # 代理服务器地址
  port: 443
  udp: true
  uuid: <replace-this> # X-ray 服务端的 UUID
  flow: xtls-rprx-vision
  tls: true
  servername: <replace-this> # 服务端配置的可用 server name
  client-fingerprint: chrome
  skip-cert-verify: false
  reality-opts: 
    public-key: <replace-this> # 与服务端私钥配套的公钥
  network: tcp
```

将所有 `<replace-this>` 替换为自己的信息，如果服务端设置了 shortIds 可自行配置。

## 参考连接

- https://github.com/XTLS/Xray-examples
- https://github.com/zxcvos/Xray-script
