---
title: 虚拟机部署 Kubernetes v1.10.3  高可用集群 - 03 部署 Master
date: 2018-05-30 17:44
tags: 
  - Jenkins
  - Java
  - Kubernetes
---

本部分将说明如何建立与设定 Kubernetes Master 角色，过程中会部署以下元件：

- kube-apiserver：提供 REST APIs，包含授权、认证与状态储存等。
- kube-controller-manager：负责维护集群的状态，如自动扩展，滚动更新等。
- kube-scheduler：负责资源排程，依据预定的排程策略将 Pod 分配到对应节点上。
- Etcd：储存集群所有状态的 Key/Value 储存系统。
- HAProxy：提供负载平衡器。
- Keepalived：提供虚拟网络位址 (VIP)。
<!-- more -->
### 部署和设定

首先在所有 Master 节点下载部署元件的 YAML 文件，这边不采用二进制执行档与 Systemd 来管理这些元件，全部采用 Static Pod 来达成。这边将配置文件放到 `/etc/kubernetes/manifests` 目录。

以下所有操作需要在每个 Master 上都操作。

```bash
$ mkdir -p /etc/kubernetes/manifests && cd /etc/kubernetes/manifests

$ # 替换为当前部署的 master 机器 IP
$ export MASTER_IP=192.168.56.11
```

#### kube-apiserver 配置

```bash
$ cat > /etc/kubernetes/manifests/kube-apiserver.yaml <<EOF
apiVersion: v1
kind: Pod
metadata:
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ""
  labels:
    component: kube-apiserver
    tier: control-plane
  name: kube-apiserver
  namespace: kube-system
spec:
  hostNetwork: true
  containers :
  - name: kube-apiserver
    image: gcr.io/google_containers/kube-apiserver-amd64:v1.10.3
    command:
      - kube-apiserver
      - --v=0
      - --logtostderr=true
      - --allow-privileged=true
      - --advertise-address=${MASTER_IP}
      - --bind-address=${MASTER_IP}
      - --insecure-bind-address=${MASTER_IP}
      - --secure-port=5443
      - --insecure-port=7070
      - --service-cluster-ip-range=10.254.0.0/16
      - --service-node-port-range=30000-32767
      - --etcd-servers=https://192.168.56.11:2379,https://192.168.56.12:2379,https://192.168.56.13:2379
      - --etcd-cafile=/etc/kubernetes/ssl/ca.pem
      - --etcd-certfile=/etc/etcd/ssl/etcd.pem
      - --etcd-keyfile=/etc/etcd/ssl/etcd-key.pem
      - --client-ca-file=/etc/kubernetes/ssl/ca.pem
      - --tls-cert-file=/etc/kubernetes/ssl/apiserver.pem
      - --tls-private-key-file=/etc/kubernetes/ssl/apiserver-key.pem
      - --kubelet-client-certificate=/etc/kubernetes/ssl/apiserver.pem
      - --kubelet-client-key=/etc/kubernetes/ssl/apiserver-key.pem
      - --service-account-key-file=/etc/kubernetes/ssl/sa.pub
      - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
      - --admission-control=Initializers,NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,NodeRestriction,ResourceQuota
      - --authorization-mode=Node,RBAC
      - --enable-bootstrap-token-auth=true
      - --requestheader-client-ca-file=/etc/kubernetes/ssl/ca.pem
      - --proxy-client-cert-file=/etc/kubernetes/ssl/front-proxy-client.pem
      - --proxy-client-key-file=/etc/kubernetes/ssl/front-proxy-client-key.pem
      - --requestheader-allowed-names=aggregator
      - --requestheader-group-headers=X-Remote-Group
      - --requestheader-extra-headers-prefix=X-Remote-Extra-
      - --requestheader-username-headers=X-Remote-User
      - --audit-log-maxage=30
      - --audit-log-maxbackup=3
      - --audit-log-maxsize=100
      - --audit-log-path=/var/log/kubernetes/audit.log
      - --audit-policy-file=/etc/kubernetes/audit-policy.yml
      - --experimental-encryption-provider-config=/etc/kubernetes/encryption.yml
      - --event-ttl=1h
    livenessProbe:
      failureThreshold: 8
      httpGet:
        host: 127.0.0.1
        path: /healthz
        port: 6443
        scheme: HTTPS
      initialDelaySeconds: 15
      timeoutSeconds: 15
    resources:
      requests:
        cpu: 250m
    volumeMounts:
    - mountPath: /var/log/kubernetes
      name: k8s-audit-log
    - mountPath: /etc/kubernetes/ssl
      name: k8s-certs
      readOnly: true
    - mountPath: /etc/ssl/certs
      name: ca-certs
      readOnly: true
    - mountPath: /etc/kubernetes/encryption.yml
      name: encryption-config
      readOnly: true
    - mountPath: /etc/kubernetes/audit-policy.yml
      name: audit-config
      readOnly: true
    - mountPath: /etc/etcd/ssl
      name: etcd-ca-certs
      readOnly: true
  volumes:
  - hostPath:
      path: /var/log/kubernetes
      type: DirectoryOrCreate
    name: k8s-audit-log
  - hostPath:
      path: /etc/kubernetes/ssl
      type: DirectoryOrCreate
    name: k8s-certs
  - hostPath:
      path: /etc/kubernetes/encryption.yml
      type: FileOrCreate
    name: encryption-config
  - hostPath:
      path: /etc/kubernetes/audit-policy.yml
      type: FileOrCreate
    name: audit-config
  - hostPath:
      path: /etc/ssl/certs
      type: DirectoryOrCreate
    name: ca-certs
  - hostPath:
      path: /etc/etcd/ssl
      type: DirectoryOrCreate
    name: etcd-ca-certs
EOF
```
- kube-apiserver 中的NodeRestriction 请参考 [Using Node Authorization](https://kubernetes.io/docs/admin/authorization/node/)

产生一个用来加密 Etcd 的 Key:

```bash
$  head -c 32 /dev/urandom | base64
TUkHNhh1j+DKsnW3VWK8ZVmfQy3i9a/VaRuoqgha4F4=
```
**注意每台master节点需要用一样的 Key**

在 `/etc/kubernetes` 目录下建立 encryption.yml 的加密 YAML 文件：
```bash
$ cat <<EOF > /etc/kubernetes/encryption.yml
kind: EncryptionConfig
apiVersion: v1
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: TUkHNhh1j+DKsnW3VWK8ZVmfQy3i9a/VaRuoqgha4F4=
      - identity: {}
EOF
```
- Etcd 资料加密可参考 [Encrypting data at rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)

在/etc/kubernetes/目录下，建立audit-policy.yml的审计策略 YAML 文件：

```bash
$ cat <<EOF > /etc/kubernetes/audit-policy.yml
apiVersion: audit.k8s.io/v1beta1
kind: Policy
rules:
  - level: Metadata
EOF
```
- Audit Policy 请参考 [Auditing](https://kubernetes.io/docs/tasks/debug-application-cluster/audit/)

####  kube-controller-manager 配置

```bash
$ cat > /etc/kubernetes/manifests/kube-controller-manager.yml <<EOF
apiVersion: v1
kind: Pod
metadata:
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ""
  labels:
    component: kube-controller-manager
    tier: control-plane
  name: kube-controller-manager
  namespace: kube-system
spec:
  hostNetwork: true
  containers:
  - name: kube-controller-manager
    image: gcr.io/google_containers/kube-controller-manager-amd64:v1.10.3
    command:
      - kube-controller-manager
      - --v=0
      - --logtostderr=true
      - --address=127.0.0.1
      - --root-ca-file=/etc/kubernetes/ssl/ca.pem
      - --cluster-signing-cert-file=/etc/kubernetes/ssl/ca.pem
      - --cluster-signing-key-file=/etc/kubernetes/ssl/ca-key.pem
      - --service-account-private-key-file=/etc/kubernetes/ssl/sa.key
      - --kubeconfig=/etc/kubernetes/controller-manager.conf
      - --leader-elect=true
      - --use-service-account-credentials=true
      - --node-monitor-grace-period=40s
      - --node-monitor-period=5s
      - --pod-eviction-timeout=2m0s
      - --controllers=*,bootstrapsigner,tokencleaner
      - --allocate-node-cidrs=true
      - --cluster-cidr=172.30.0.0/16
      - --service-cluster-ip-range=10.254.0.0/16
      - --node-cidr-mask-size=24
    livenessProbe:
      failureThreshold: 8
      httpGet:
        host: 127.0.0.1
        path: /healthz
        port: 10252
        scheme: HTTP
      initialDelaySeconds: 15
      timeoutSeconds: 15
    resources:
      requests:
        cpu: 200m
    volumeMounts:
    - mountPath: /etc/kubernetes/ssl
      name: k8s-certs
      readOnly: true
    - mountPath: /etc/ssl/certs
      name: ca-certs
      readOnly: true
    - mountPath: /etc/kubernetes/controller-manager.conf
      name: kubeconfig
      readOnly: true
    - mountPath: /usr/libexec/kubernetes/kubelet-plugins/volume/exec
      name: flexvolume-dir
  volumes:
  - hostPath:
      path: /etc/kubernetes/ssl
      type: DirectoryOrCreate
    name: k8s-certs
  - hostPath:
      path: /etc/ssl/certs
      type: DirectoryOrCreate
    name: ca-certs
  - hostPath:
      path: /etc/kubernetes/controller-manager.conf
      type: FileOrCreate
    name: kubeconfig
  - hostPath:
      path: /usr/libexec/kubernetes/kubelet-plugins/volume/exec
      type: DirectoryOrCreate
    name: flexvolume-dir
EOF
```

####  kube-scheduler 配置

```bash
$ cat > /etc/kubernetes/manifests/kube-scheduler.yml <<EOF
apiVersion: v1
kind: Pod
metadata:
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ""
  labels:
    component: kube-scheduler
    tier: control-plane
  name: kube-scheduler
  namespace: kube-system
spec:
  hostNetwork: true
  containers:
  - name: kube-scheduler
    image: gcr.io/google_containers/kube-scheduler-amd64:v1.10.3
    command:
      - kube-scheduler
      - --v=0
      - --logtostderr=true
      - --address=127.0.0.1
      - --leader-elect=true
      - --kubeconfig=/etc/kubernetes/scheduler.conf
    livenessProbe:
      failureThreshold: 8
      httpGet:
        host: 127.0.0.1
        path: /healthz
        port: 10251
        scheme: HTTP
      initialDelaySeconds: 15
      timeoutSeconds: 15
    resources:
      requests:
        cpu: 100m
    volumeMounts:
    - mountPath: /etc/kubernetes/ssl
      name: k8s-certs
      readOnly: true
    - mountPath: /etc/kubernetes/scheduler.conf
      name: kubeconfig
      readOnly: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/ssl
      type: DirectoryOrCreate
    name: k8s-certs
  - hostPath:
      path: /etc/kubernetes/scheduler.conf
      type: FileOrCreate
    name: kubeconfig
EOF
```

#### etcd 配置

```bash
$ cat > /etc/kubernetes/manifests/etcd.yml <<EOF
apiVersion: v1
kind: Pod
metadata:
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ""
  labels:
    component: etcd
    tier: control-plane
  name: etcd
  namespace: kube-system
spec:
  hostNetwork: true
  containers:
  - name: etcd
    image: gcr.io/google_containers/etcd-amd64:3.1.13
    command:
    - etcd
    - --config-file=/etc/etcd/etcd.config.yml
    livenessProbe:
      failureThreshold: 8
      tcpSocket:
        port: 2379
      initialDelaySeconds: 15
      timeoutSeconds: 15
    volumeMounts:
    - mountPath: /etc/etcd/ssl
      name: etcd-certs
    - mountPath: /etc/kubernetes/ssl
      name: kubernetes-certs
    - mountPath: /etc/etcd/etcd.config.yml
      name: etcd-conf
    - mountPath: /var/lib/etcd
      name: data
  volumes:
  - hostPath:
      path: /etc/etcd/ssl
      type: DirectoryOrCreate
    name: etcd-certs
  - hostPath:
      path: /etc/kubernetes/ssl
      type: DirectoryOrCreate
    name: kubernetes-certs
  - hostPath:
      path: /etc/etcd/etcd.config.yml
    name: etcd-conf
  - hostPath:
      path: /var/lib/etcd
      type: DirectoryOrCreate
    name: data
EOF
```

etcd.config.yml:

```bash
$ cat > /etc/etcd/etcd.config.yml <<EOF
name: '${HOSTNAME}'
data-dir: /var/lib/etcd
wal-dir: /var/lib/etcd/wal
snapshot-count: 10000
heartbeat-interval: 100
election-timeout: 1000
quota-backend-bytes: 0
listen-peer-urls: 'https://0.0.0.0:2380'
listen-client-urls: 'https://0.0.0.0:2379'
max-snapshots: 5
max-wals: 5
cors:
initial-advertise-peer-urls: 'https://${MASTER_IP}:2380'
advertise-client-urls: 'https://${MASTER_IP}:2379'
discovery:
discovery-fallback: 'proxy'
discovery-proxy:
discovery-srv:
initial-cluster: 'kube-m1=https://192.168.56.11:2380,kube-m2=https://192.168.56.12:2380,kube-m3=https://192.168.56.13:2380'
initial-cluster-token: 'etcd-k8s-cluster'
initial-cluster-state: 'new'
strict-reconfig-check: false
enable-v2: true
enable-pprof: true
proxy: 'off'
proxy-failure-wait: 5000
proxy-refresh-interval: 30000
proxy-dial-timeout: 1000
proxy-write-timeout: 5000
proxy-read-timeout: 0
client-transport-security:
  ca-file: '/etc/kubernetes/ssl/ca.pem'
  cert-file: '/etc/etcd/ssl/etcd.pem'
  key-file: '/etc/etcd/ssl/etcd-key.pem'
  client-cert-auth: true
  trusted-ca-file: '/etc/kubernetes/ssl/ca.pem'
  auto-tls: true
peer-transport-security:
  ca-file: '/etc/kubernetes/ssl/ca.pem'
  cert-file: '/etc/etcd/ssl/etcd.pem'
  key-file: '/etc/etcd/ssl/etcd-key.pem'
  peer-client-cert-auth: true
  trusted-ca-file: '/etc/kubernetes/ssl/ca.pem'
  auto-tls: true
debug: false
log-package-levels:
log-output: default
force-new-cluster: false
EOF
```

#### haproxy 配置

```bash
$ cat > /etc/kubernetes/manifests/haproxy.yml <<EOF
kind: Pod
apiVersion: v1
metadata:
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ""
  labels:
    component: haproxy
    tier: control-plane
  name: haproxy
  namespace: kube-system
spec:
  hostNetwork: true
  containers:
  - name: haproxy
    image: kairen/haproxy:1.7
    resources:
      requests:
        cpu: 100m
    volumeMounts:
    - name: cfg-volume
      readOnly: true
      mountPath: "/usr/local/etc/haproxy/haproxy.cfg"
  volumes:
  - name: cfg-volume
    hostPath:
      path: "/etc/haproxy/haproxy.cfg"
EOF
```

haproxy.cfg：

```bash
$ mkdir -p /etc/haproxy

$ cat > /etc/haproxy/haproxy.cfg <<EOF
global
  log 127.0.0.1 local0
  log 127.0.0.1 local1 notice
  tune.ssl.default-dh-param 2048

defaults
  log global
  mode http
  #option httplog
  option dontlognull
  timeout connect 5000ms
  timeout client 50000ms
  timeout server 50000ms

listen stats
    bind :9090
    mode http
    balance
    stats uri /haproxy_stats
    stats auth admin:admin123
    stats admin if TRUE

frontend api-https
   mode tcp
   bind :6443
   default_backend https-backend

frontend api-http
   mode tcp
   bind :8080
   default_backend http-backend

backend https-backend
    mode tcp
    server  api1  192.168.56.11:5443  check
    server  api2  192.168.56.12:5443  check
    server  api3  192.168.56.13:5443  check

backend http-backend
    mode tcp
    server  api1  192.168.56.11:7070  check
    server  api2  192.168.56.12:7070  check
    server  api3  192.168.56.13:7070  check
EOF
```

#### keepalived 配置

```bash
$ cat > /etc/kubernetes/manifests/keepalived.yml <<EOF
kind: Pod
apiVersion: v1
metadata:
  annotations:
    scheduler.alpha.kubernetes.io/critical-pod: ""
  labels:
    component: keepalived
    tier: control-plane
  name: keepalived
  namespace: kube-system
spec:
  hostNetwork: true
  containers:
  - name: keepalived
    image: kairen/keepalived:1.2.24
    env:
    - name: VIRTUAL_IP
      value: 192.168.56.10
    - name: INTERFACE
      value: eth1
    - name: VIRTUAL_MASK
      value: "24"
    - name: CHECK_IP
      value: any
    - name: CHECK_PORT
      value: "2379"
    - name: VRID
      value: "53"
    resources:
      requests:
        cpu: 100m
    securityContext:
      privileged: true
      capabilities:
        add:
        - NET_ADMIN
EOF
```

#### kubelet.service 配置

安装 cni 网络 插件：

```bash
$ mkdir -p /opt/cni/bin && cd /opt/cni/bin
$ export CNI_URL="https://github.com/containernetworking/plugins/releases/download"
$ wget -qO- "${CNI_URL}/v0.6.0/cni-plugins-amd64-v0.6.0.tgz" | tar -zx
```

kubelet.service：

```bash
$ cat > /usr/lib/systemd/system/kubelet.service <<EOF
[Unit]
Description=Kubernetes Kubelet
Documentation=https://github.com/GoogleCloudPlatform/kubernetes
After=docker.service
Requires=docker.service

[Service]
Environment="KUBELET_KUBECONFIG_ARGS=--kubeconfig=/etc/kubernetes/kubelet.conf"
Environment="KUBELET_SYSTEM_PODS_ARGS=--pod-manifest-path=/etc/kubernetes/manifests --allow-privileged=true"
Environment="KUBELET_NETWORK_ARGS=--network-plugin=cni --cni-conf-dir=/etc/cni/net.d --cni-bin-dir=/opt/cni/bin"
Environment="KUBELET_DNS_ARGS=--cluster-dns=10.254.0.2 --cluster-domain=cluster.local"
Environment="KUBELET_AUTHZ_ARGS=--authorization-mode=Webhook --client-ca-file=/etc/kubernetes/ssl/ca.pem"
Environment="KUBELET_CADVISOR_ARGS=--cadvisor-port=0"
Environment="KUBELET_CERTIFICATE_ARGS=--rotate-certificates=true --cert-dir=/var/lib/kubelet/ssl"
Environment="KUBELET_EXTRA_ARGS=--node-labels=node-role.kubernetes.io/master='' --logtostderr=true --v=0 --fail-swap-on=false --cgroup-driver=systemd"
ExecStart=/usr/local/bin/kubelet \$KUBELET_KUBECONFIG_ARGS \$KUBELET_SYSTEM_PODS_ARGS \$KUBELET_NETWORK_ARGS \$KUBELET_DNS_ARGS \$KUBELET_AUTHZ_ARGS \$KUBELET_CADVISOR_ARGS \$KUBELET_CERTIFICATE_ARGS \$KUBELET_EXTRA_ARGS
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### 启动 kubelet

```bash
$ mkdir -p /var/lib/kubelet /var/log/kubernetes /var/lib/etcd

$ systemctl enable kubelet.service && systemctl start kubelet.service
```

### 验证集群


完成后，在任意一台master节点复制 admin kubeconfig 文件，并通过简单指令验证：

```bash
$ cp /etc/kubernetes/admin.conf ~/.kube/config

$ kubectl get cs
NAME                 STATUS    MESSAGE              ERROR
controller-manager   Healthy   ok
scheduler            Healthy   ok
etcd-2               Healthy   {"health": "true"}
etcd-1               Healthy   {"health": "true"}
etcd-0               Healthy   {"health": "true"}

$ kubectl get node
NAME      STATUS     ROLES     AGE       VERSION
kube-m1    NotReady   master    52s       v1.10.3
kube-m2    NotReady   master    51s       v1.10.3
kube-m3    NotReady   master    50s       v1.10.3

```

接着确认服务能够执行 logs 等指令:

```bash
$ kubectl -n kube-system logs -f kube-scheduler-kube-m1
Error from server (Forbidden): Forbidden (user=kubernetes, verb=get, resource=nodes, subresource=proxy) ( pods/log kube-scheduler-kube-m1)
```

这边会发现出现 403 Forbidden 问题，这是因为 kube-apiserver user 并没有 nodes 的资源存取权限，属于正常。

由于上述权限问题，必需建立一个apiserver-to-kubelet-rbac.yml来定义权限，以供对 Nodes 容器执行 logs、exec 等指令。在任意一台master节点执行以下指令：

```bash
$ cat > apiserver-to-kubelet-rbac.yml <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  labels:
    kubernetes.io/bootstrapping: rbac-defaults
  name: system:kube-apiserver-to-kubelet
rules:
  - apiGroups:
      - ""
    resources:
      - nodes/proxy
      - nodes/stats
      - nodes/log
      - nodes/spec
      - nodes/metrics
    verbs:
      - "*"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-apiserver
  namespace: ""
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-apiserver-to-kubelet
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: kube-apiserver
EOF

$ kubectl apply -f apiserver-to-kubelet-rbac.yml
clusterrole.rbac.authorization.k8s.io "system:kube-apiserver-to-kubelet" created
clusterrolebinding.rbac.authorization.k8s.io "system:kube-apiserver" created

$ # 测试 logs
$ kubectl -n kube-system logs -f kube-scheduler-kube-m1
```

设定master节点允许 Taint：
```bash
$ kubectl taint nodes node-role.kubernetes.io/master="":NoSchedule --all
node "kube-m1" tainted
node "kube-m2" tainted
node "kube-m3" tainted
```

### 建立 TLS Bootstrapping RBAC 与 Secret

由于本次安装启用了 TLS 认证，因此每个节点的 kubelet 都必须使用 kube-apiserver 的 CA 的凭证后，才能与 kube-apiserver 进行沟通，而该过程需要手动针对每台节点单独签署凭证是一件繁琐的事情，且一旦节点增加会延伸出管理不易问题; 而 TLS bootstrapping 目标就是解决该问题，通过让 kubelet 先使用一个预定低权限使用者连接到 kube-apiserver，然后在对 kube-apiserver 申请凭证签署，当授权 Token 一致时，Node 节点的 kubelet 凭证将由 kube-apiserver 动态签署提供。具体作法可以参考 TLS Bootstrapping 与 Authenticating with Bootstrap Tokens。

首先在 kube-m1 建立一个变量来产生BOOTSTRAP_TOKEN，并建立bootstrap-kubelet.conf的 Kubernetes config 档：

```bash
$ cd /etc/kubernetes/ssl
$ export TOKEN_ID=$(openssl rand 3 -hex)
$ export TOKEN_SECRET=$(openssl rand 8 -hex)
$ export BOOTSTRAP_TOKEN=${TOKEN_ID}.${TOKEN_SECRET}
$ export KUBE_APISERVER="https://192.168.56.10:6443"
$ # 设置集群参数
$ kubectl config set-cluster kubernetes \
    --certificate-authority=ca.pem \
    --embed-certs=true \
    --server=${KUBE_APISERVER} \
    --kubeconfig=../bootstrap-kubelet.conf
$ # 设置客户端认证参数
$ kubectl config set-credentials tls-bootstrap-token-user \
    --token=${BOOTSTRAP_TOKEN} \
    --kubeconfig=../bootstrap-kubelet.conf
$ # 设置上下文参数
$ kubectl config set-context tls-bootstrap-token-user@kubernetes \
    --cluster=kubernetes \
    --user=tls-bootstrap-token-user \
    --kubeconfig=../bootstrap-kubelet.conf
$ # 设置默认上下文
$ kubectl config use-context tls-bootstrap-token-user@kubernetes \
    --kubeconfig=../bootstrap-kubelet.conf
```

接着在 kube-m1 建立 TLS bootstrap secret 来提供自动签证使用：

```bash
$ cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Secret
metadata:
  name: bootstrap-token-${TOKEN_ID}
  namespace: kube-system
type: bootstrap.kubernetes.io/token
stringData:
  token-id: ${TOKEN_ID}
  token-secret: ${TOKEN_SECRET}
  usage-bootstrap-authentication: "true"
  usage-bootstrap-signing: "true"
  auth-extra-groups: system:bootstrappers:default-node-token
EOF
secret "bootstrap-token-ea4387" created

# 在 kube-m1 建立 TLS Bootstrap Autoapprove RBAC：

$ cat <<EOF | kubectl create -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kubelet-bootstrap
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node-bootstrapper
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:bootstrappers:default-node-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-autoapprove-bootstrap
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:nodeclient
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:bootstrappers:default-node-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-autoapprove-certificate-rotation
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:certificates.k8s.io:certificatesigningrequests:selfnodeclient
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:nodes
EOF
clusterrolebinding.rbac.authorization.k8s.io "kubelet-bootstrap" created
clusterrolebinding.rbac.authorization.k8s.io "node-autoapprove-bootstrap" created
clusterrolebinding.rbac.authorization.k8s.io "node-autoapprove-certificate-rotation" created
```
