---
title: 虚拟机部署 Kubernetes v1.10.3  高可用集群 - 05 总结
date: 2018-05-30 17:47
tags: 
  - Jenkins
  - Java
  - Kubernetes
---

本文的大部分思路参考了 [『Kubernetes v1.10.x HA 全手動苦工安裝教學(TL;DR)』](https://kairen.github.io/2018/04/05/kubernetes/deploy/manual-v1.10/) 这篇文章。

不过，虽然 Kairen 同志已经写得很详细了，但是实践起来还是有不少问题的，我在他的基础上根据自己的实践过程写了这篇文档。

### 可能会出现的问题

1. apiserver 会一直报错：

    ```bash
    x509.go:172] x509: subject with cn=system:kube-controller-manager is not in the allowed list: [aggregator]
    ```

    一开始以为是证书有问题，但是查了很久也没发现问题所在，可以忽略此错误，暂时未发现对集群有什么影响。

2. pod 无法启动，出现 `Permission denied` 之类的错误。

    是由于主机未关闭 SELinux 造成的，参考『虚拟机部署 Kubernetes v1.10.3  高可用集群 - 01 虚拟机环境准备』中的步骤关闭 SELinux 即可。

3. 无法下载镜像问题（墙）。

    可以使用 [shadowsocks](https://github.com/shadowsocks/shadowsocks-windows) + [Proxifier](http://www.proxifier.com/) 代理解决；或者使用阿里云仓库里的镜像，脚本如下：

```bash
$ ALI_REP="registry.cn-hangzhou.aliyuncs.com/google_containers"
$ GCR="gcr.io/google_containers"
$ K8S_GCR="k8s.gcr.io"

$ for IMAGE in kube-controller-manager-amd64:v1.10.3 kube-apiserver-amd64:v1.10.3 kube-scheduler-amd64:v1.10.3 etcd-amd64:3.1.13; do
    echo "--- $IMAGE ---"
    docker pull $ALI_REP/$IMAGE
    docker tag $ALI_REP/$IMAGE $GCR/$IMAGE
    docker rmi $ALI_REP/$IMAGE
done

$ for IMAGE in kube-proxy-amd64:v1.10.3 pause-amd64:3.1; do
    echo "--- $IMAGE ---"
    docker pull $ALI_REP/$IMAGE
    docker tag $ALI_REP/$IMAGE $K8S_GCR/$IMAGE
    docker rmi $ALI_REP/$IMAGE
done
```