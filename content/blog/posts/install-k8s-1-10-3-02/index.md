---
title: 虚拟机部署 Kubernetes v1.10.3  高可用集群 - 02 生成证书
date: 2018-05-30 17:43
tags: 
  - Jenkins
  - Java
  - Kubernetes
---

在这个部分，将需要产生多个元件的 Certificates，这包含 Etcd、Kubernetes 元件等，并且每个集群都会有一个根数位凭证认证机构 (Root Certificate Authority) 被用在认证 API Server 与 Kubelet 端的凭证。

P.S. 这边要注意 CA JSON 档的 CN(Common Name)与O(Organization) 等内容是会影响 Kubernetes 元件认证的。
### 准备工作

在主机 kube-m1 上安装 cfssl ，在任意目录执行以下命令 ：

```bash
$ wget https://pkg.cfssl.org/R1.3.2/cfssl_linux-amd64 && chmod +x cfssl_linux-amd64 && mv cfssl_linux-amd64 /usr/local/bin/cfssl

$ wget https://pkg.cfssl.org/R1.2/cfssljson_linux-amd64 && chmod +x cfssljson_linux-amd64 && mv cfssljson_linux-amd64 /usr/local/bin/cfssljson

$ wget https://pkg.cfssl.org/R1.2/cfssl-certinfo_linux-amd64 && chmod +x cfssl-certinfo_linux-amd64 && mv cfssl-certinfo_linux-amd64 /usr/local/bin/cfssl-certinfo
```
### 创建 CA 证书和秘钥

CA 证书 k8s 和 etcd 共用一份，放在 `/etc/kubernetes/ssl` 下。

#### 创建证书文件夹

```bash
mkdir -p /etc/kubernetes/ssl && cd /etc/kubernetes/ssl
```

#### 创建 CA 配置文件：

```bash
$ cat > ca-config.json <<EOF
{
  "signing": {
    "default": {
      "expiry": "8760h"
    },
    "profiles": {
      "kubernetes": {
        "usages": [
            "signing",
            "key encipherment",
            "server auth",
            "client auth"
        ],
        "expiry": "8760h"
      }
    }
  }
}
EOF
```

- ca-config.json：可以定义多个 profiles，分别指定不同的过期时间、使用场景等参数；后续在签名证书时使用某个 profile；
- signing：表示该证书可用于签名其它证书；生成的 ca.pem 证书中 CA=TRUE；
- server auth：表示 client 可以用该 CA 对 server 提供的证书进行验证；
- client auth：表示 server 可以用该 CA 对 client 提供的证书进行验证。

#### 创建 CA 证书签名请求：

```bash
$ cat > ca-csr.json <<EOF
{
  "CN": "kubernetes",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShenZhen",
      "L": "ShenZhen",
      "O": "Kubernetes",
      "OU": "4Paradigm"
    }
  ]
}
EOF
```
- CN"：`Common Name`，kube-apiserver 从证书中提取该字段作为请求的用户名 (User Name)；浏览器使用该字段验证网站是否合法；
- "O"：`Organization`，kube-apiserver 从证书中提取该字段作为请求用户所属的组 (Group)；

#### 生成 CA keys 与 Certificate

```bash
$ cfssl gencert -initca ca-csr.json | cfssljson -bare ca
$ ls ca*
ca-config.json  ca.csr  ca-csr.json  ca-key.pem  ca.pem
```

### Etcd

在此步骤中将创建与 Etcd 相关的证书文件。

#### 创建 Etcd 证书文件夹

```bash
$ mkdir -p /etc/etcd/ssl && cd /etc/etcd/ssl
```

#### 创建 TLS 秘钥和证书

为了保证通信安全，客户端(如 etcdctl) 与 etcd 集群、etcd 集群之间的通信需要使用 TLS 加密，本节创建 etcd TLS 加密所需的证书和私钥。

创建 etcd 证书签名请求：

```bash
$ cat > etcd-csr.json <<EOF
{
  "CN": "etcd",
  "hosts": [
    "127.0.0.1",
    "192.168.56.11",
    "192.168.56.12",
    "192.168.56.13"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShenZhen",
      "L": "ShenZhen",
      "O": "Kubernetes",
      "OU": "4Paradigm"
    }
  ]
}
EOF
```

- hosts 字段指定授权使用该证书的 etcd 节点 IP，在这里指三台 Master 主机。

生成 etcd 证书和私钥：

```bash
$ cfssl gencert -ca=/etc/kubernetes/ssl/ca.pem \
  -ca-key=/etc/kubernetes/ssl/ca-key.pem \
  -config=/etc/kubernetes/ssl/ca-config.json \
  -profile=kubernetes etcd-csr.json | cfssljson -bare etcd

$ ls etcd*.pem
etcd-key.pem etcd.pem
```

#### 分发文件

分发前先删除不必要文件：

```bash
$ cd /etc/etcd/ssl

$ rm -rf *.json *.csr

$ ls /etc/etcd/ssl
etcd-key.pem  etcd.pem
```

复制相关文件至其他 Etcd 节点，这边为所有master节点：

```bash
$ for NODE in kube-m2 kube-m3; do
    echo "--- $NODE ---"
    ssh ${NODE} "mkdir -p /etc/etcd/ssl"
    for FILE in etcd-key.pem  etcd.pem; do
      scp /etc/etcd/ssl/${FILE} ${NODE}:/etc/etcd/ssl/${FILE}
    done
done
```

### Kubernetes

在此步骤中将创建与 Kubernetes 相关的证书文件。

#### 回到证书文件夹

```bash
$ cd /etc/kubernetes/ssl
```

#### 生成 kube-apiserver 凭证

创建 Api Server 证书签名请求:

```bash
$ cat > /etc/kubernetes/ssl/apiserver-csr.json <<EOF
{
  "CN": "kube-apiserver",
  "hosts": [
    "127.0.0.1",
    "192.168.56.10",
    "10.254.0.1",
    "kubernetes",
    "kubernetes.default",
    "kubernetes.default.svc",
    "kubernetes.default.svc.cluster",
    "kubernetes.default.svc.cluster.local"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShenZhen",
      "L": "ShenZhen",
      "O": "Kubernetes",
      "OU": "4Paradigm"
    }
  ]
}
EOF
```
- `192.168.56.10` 为 虚拟 IP；
- `10.254.0.1` 为 kube-apiserver --service-cluster-ip-range 选项值指定的网段的第一个IP，如 "10.254.0.1"。

生成 Api Server 证书和私钥:

```bash
$ cd /etc/kubernetes/ssl && cfssl gencert -ca=/etc/kubernetes/ssl/ca.pem \
  -ca-key=/etc/kubernetes/ssl/ca-key.pem \
  -config=/etc/kubernetes/ssl/ca-config.json \
  -profile=kubernetes /etc/kubernetes/ssl/apiserver-csr.json | cfssljson -bare apiserver

$ ls apiserver*.pem
apiserver-key.pem  apiserver.pem
```

#### 生成 Front Proxy 凭证

创建 Front Proxy 证书签名请求：

```bash
$ cat > /etc/kubernetes/ssl/front-proxy-client-csr.json <<EOF
{
  "CN": "front-proxy-client",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  }
}
EOF
```

生成 Front Proxy 证书和私钥:

```bash
$ cd /etc/kubernetes/ssl && cfssl gencert -ca=/etc/kubernetes/ssl/ca.pem \
  -ca-key=/etc/kubernetes/ssl/ca-key.pem \
  -config=/etc/kubernetes/ssl/ca-config.json \
  -profile=kubernetes /etc/kubernetes/ssl/front-proxy-client-csr.json | cfssljson -bare front-proxy-client

$ ls front-proxy-client*.pem
front-proxy-client-key.pem  front-proxy-client.pem
```

#### 生成 admin 凭证

创建 admin 证书签名请求：
```bash
$ cat > /etc/kubernetes/ssl/admin-csr.json <<EOF
{
    "CN":"admin",
    "hosts": [],
    "key":{
        "algo":"rsa",
        "size":2048
    },
    "names":[{
        "C":"CN",
        "ST":"Shenzhen",
        "L":"Shenzhen",
        "O":"system:masters",
        "OU":"4Paradigm"
        }]
}
EOF
```

生成 admin 证书和私钥:
```bash
$ cd /etc/kubernetes/ssl && cfssl gencert -ca=/etc/kubernetes/ssl/ca.pem \
  -ca-key=/etc/kubernetes/ssl/ca-key.pem \
  -config=/etc/kubernetes/ssl/ca-config.json \
  -profile=kubernetes admin-csr.json | cfssljson -bare admin

$ ls admin*.pem
admin-key.pem  admin.pem
```

生成 kubectl kubeconfig 文件:

```ba sh
$ cd /etc/kubernetes

$ export KUBE_APISERVER="https://192.168.56.10:6443"

$ # 设置集群参数
$ kubectl config set-cluster kubernetes \
  --certificate-authority=/etc/kubernetes/ssl/ca.pem \
  --embed-certs=true \
  --server=${KUBE_APISERVER} \
  --kubeconfig=/etc/kubernetes/admin.conf

$ # 设置客户端认证参数
$ kubectl config set-credentials kubernetes-admin \
  --client-certificate=/etc/kubernetes/ssl/admin.pem \
  --embed-certs=true \
  --client-key=/etc/kubernetes/ssl/admin-key.pem \
  --kubeconfig=/etc/kubernetes/admin.conf

$ # 设置上下文参数
$ kubectl config set-context kubernetes-admin@kubernetes \
  --cluster=kubernetes \
  --user=kubernetes-admin \
  --kubeconfig=/etc/kubernetes/admin.conf
  
$ # 设置默认上下文
$ kubectl config use-context kubernetes-admin@kubernetes \
  --kubeconfig=/etc/kubernetes/admin.conf
```

#### 生成 Controller Manager 凭证

创建 Controller Manager 证书签名请求：
```bash
$ cat > /etc/kubernetes/ssl/controller-manager-csr.json <<EOF
{
    "CN":"system:kube-controller-manager",
    "hosts": [],
    "key":{
        "algo":"rsa",
        "size":2048
    },
    "names":[{
        "C":"CN",
        "ST":"Shenzhen",
        "L":"Shenzhen",
        "O":"system:kube-controller-manager",
        "OU":"4Paradigm"
        }]
}
EOF
```

生成 Controller Manager 证书和私钥:
```bash
$ cd /etc/kubernetes/ssl && cfssl gencert -ca=/etc/kubernetes/ssl/ca.pem \
  -ca-key=/etc/kubernetes/ssl/ca-key.pem \
  -config=/etc/kubernetes/ssl/ca-config.json \
  -profile=kubernetes controller-manager-csr.json | cfssljson -bare controller-manager

$ ls controller-manager*.pem
controller-manager-key.pem  controller-manager.pem
```

生成 Controller Manager kubeconfig 文件:

```bash
$ cd /etc/kubernetes

$ export KUBE_APISERVER="https://192.168.56.10:6443"

$ # 设置集群参数
$ kubectl config set-cluster kubernetes \
    --certificate-authority=/etc/kubernetes/ssl/ca.pem \
    --embed-certs=true \
    --server=${KUBE_APISERVER} \
    --kubeconfig=/etc/kubernetes/controller-manager.conf

$ # 设置客户端认证参数
$ kubectl config set-credentials system:kube-controller-manager \
    --client-certificate=/etc/kubernetes/ssl/controller-manager.pem \
    --client-key=/etc/kubernetes/ssl/controller-manager-key.pem \
    --embed-certs=true \
    --kubeconfig=/etc/kubernetes/controller-manager.conf

$ # 设置上下文参数
$ kubectl config set-context system:kube-controller-manager@kubernetes \
    --cluster=kubernetes \
    --user=system:kube-controller-manager \
    --kubeconfig=/etc/kubernetes/controller-manager.conf
  
$ # 设置默认上下文
$ kubectl config use-context system:kube-controller-manager@kubernetes \
    --kubeconfig=/etc/kubernetes/controller-manager.conf
```

#### 生成 Scheduler 凭证

创建 Scheduler 证书签名请求：
```bash
$ cat > /etc/kubernetes/ssl/scheduler-csr.json <<EOF
{
    "CN":"system:kube-scheduler",
    "hosts": [],
    "key":{
        "algo":"rsa",
        "size":2048
    },
    "names":[{
        "C":"CN",
        "ST":"Shenzhen",
        "L":"Shenzhen",
        "O":"system:kube-scheduler",
        "OU":"4Paradigm"
        }]
}
EOF
```

生成 Scheduler 证书和私钥:
```bash
$ cd /etc/kubernetes/ssl && cfssl gencert -ca=/etc/kubernetes/ssl/ca.pem \
  -ca-key=/etc/kubernetes/ssl/ca-key.pem \
  -config=/etc/kubernetes/ssl/ca-config.json \
  -profile=kubernetes scheduler-csr.json | cfssljson -bare scheduler

$ ls scheduler*.pem
scheduler-key.pem  scheduler.pem
```

生成 Scheduler kubeconfig 文件:

```bash
$ cd /etc/kubernetes

$ export KUBE_APISERVER="https://192.168.56.10:6443"

$ # 设置集群参数
$ kubectl config set-cluster kubernetes \
    --certificate-authority=/etc/kubernetes/ssl/ca.pem \
    --embed-certs=true \
    --server=${KUBE_APISERVER} \
    --kubeconfig=/etc/kubernetes/scheduler.conf

$ # 设置客户端认证参数
$ kubectl config set-credentials system:kube-scheduler \
    --client-certificate=/etc/kubernetes/ssl/scheduler.pem \
    --client-key=/etc/kubernetes/ssl/scheduler-key.pem \
    --embed-certs=true \
    --kubeconfig=/etc/kubernetes/scheduler.conf

$ # 设置上下文参数
$ kubectl config set-context system:kube-scheduler@kubernetes \
    --cluster=kubernetes \
    --user=system:kube-scheduler \
    --kubeconfig=/etc/kubernetes/scheduler.conf
  
$ # 设置默认上下文
$ kubectl config use-context system:kube-scheduler@kubernetes \
    --kubeconfig=/etc/kubernetes/scheduler.conf
```



#### 生成 Master Kubelet 凭证

创建 Master Kubelet 证书签名请求：
```bash
$ cat > /etc/kubernetes/ssl/kubelet-csr.json <<EOF
{
    "CN":"system:node:\$NODE",
    "hosts": [],
    "key":{
        "algo":"rsa",
        "size":2048
    },
    "names":[{
        "C":"CN",
        "ST":"Shenzhen",
        "L":"Shenzhen",
        "O":"system:nodes",
        "OU":"4Paradigm"
        }]
}
EOF
```

生成 所有 Master Kubelet 证书和私钥:
```bash
$ cd /etc/kubernetes/ssl
$ for NODE in kube-m1 kube-m2 kube-m3; do
    echo "--- $NODE ---"
    cp kubelet-csr.json kubelet-$NODE-csr.json;
    sed -i "s/\$NODE/$NODE/g" kubelet-$NODE-csr.json;
    cfssl gencert \
      -ca=/etc/kubernetes/ssl/ca.pem \
      -ca-key=/etc/kubernetes/ssl/ca-key.pem \
      -config=/etc/kubernetes/ssl/ca-config.json \
      -hostname=$NODE \
      -profile=kubernetes \
      kubelet-$NODE-csr.json | cfssljson -bare kubelet-$NODE
done
$ ls kubelet*.pem
kubelet-kube-m1-key.pem  kubelet-kube-m1.pem  kubelet-kube-m2-key.pem  kubelet-kube-m2.pem  kubelet-kube-m3-key.pem  kubelet-kube-m3.pem
```

完成后复制 kubelet 凭证至其他 master 节点:

```bash
$ for NODE in kube-m2 kube-m3; do
    echo "--- $NODE ---"
    ssh ${NODE} "mkdir -p /etc/kubernetes/ssl"
    for FILE in kubelet-$NODE-key.pem kubelet-$NODE.pem ca.pem; do
      scp /etc/kubernetes/ssl/${FILE} ${NODE}:/etc/kubernetes/ssl/${FILE}
    done
done
```

生成 Kubelet kubeconfig 文件:

```bash
$ for NODE in kube-m1 kube-m2 kube-m3; do
    echo "--- $NODE ---"
    ssh ${NODE} "cd /etc/kubernetes/ssl && \
      kubectl config set-cluster kubernetes \
        --certificate-authority=ca.pem \
        --embed-certs=true \
        --server=${KUBE_APISERVER} \
        --kubeconfig=../kubelet.conf && \
      kubectl config set-cluster kubernetes \
        --certificate-authority=ca.pem \
        --embed-certs=true \
        --server=${KUBE_APISERVER} \
        --kubeconfig=../kubelet.conf && \
      kubectl config set-credentials system:node:${NODE} \
        --client-certificate=kubelet-${NODE}.pem \
        --client-key=kubelet-${NODE}-key.pem \
        --embed-certs=true \
        --kubeconfig=../kubelet.conf && \
      kubectl config set-context system:node:${NODE}@kubernetes \
        --cluster=kubernetes \
        --user=system:node:${NODE} \
        --kubeconfig=../kubelet.conf && \
      kubectl config use-context system:node:${NODE}@kubernetes \
        --kubeconfig=../kubelet.conf && \
      rm kubelet-${NODE}.pem kubelet-${NODE}-key.pem"
done
```

#### 生成 Service Account 凭证

Service account 不是通过 CA 进行认证，因此不要通过 CA 来做 Service account key 的检查，这边建立一组 Private 与 Public 金钥提供给 Service account key 使用：

```bash
$ cd /etc/kubernetes/ssl
$ openssl genrsa -out sa.key 2048

$ openssl rsa -in sa.key -pubout -out sa.pub

$ ls sa.*
sa.key  sa.pub
```

####  分发文件

分发前先将无用的文件删除：

```bash
$ cd /etc/kubernetes/ssl
$ rm -rf *.json *.csr scheduler*.pem controller-manager*.pem admin*.pem kubelet*.pem
```

将凭证文件分发到其他 Master 节点：

```bash
$ for NODE in kube-m2 kube-m3; do
    echo "--- $NODE ---"
    for FILE in $(ls /etc/kubernetes/ssl/); do
      scp /etc/kubernetes/ssl/${FILE} ${NODE}:/etc/kubernetes/ssl/${FILE}
    done
done
```

复制 Kubernetes config 文件至其他master节点：

```bash
$ for NODE in kube-m2 kube-m3; do
    echo "--- $NODE ---"
    for FILE in admin.conf controller-manager.conf scheduler.conf; do
      scp /etc/kubernetes/${FILE} ${NODE}:/etc/kubernetes/${FILE}
    done
done
```
