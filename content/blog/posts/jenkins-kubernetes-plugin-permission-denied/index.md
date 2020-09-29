---
title: Jenkins kubernetes-plugin 使用 Gradle 构建时 Permission denied 问题
date: 2018-08-20 18:10
tags: 
  - Jenkins
  - Java
  - Kubernetes
  - DevOps
---

在使用 Jenkins 的 [kubernetes-plugin](https://github.com/jenkinsci/kubernetes-plugin) 插件时发现使用 [Gradle 镜像](https://hub.docker.com/_/gradle/) 构建项目时出现 Permission denied 错误，具体错误如下：

```shell
[test] Running shell script
sh: 1: cannot create /home/jenkins/workspace/test@tmp/durable-b7fece0a/jenkins-log.txt: Permission denied
sh: 1: cannot create /home/jenkins/workspace/test@tmp/durable-b7fece0a/jenkins-result.txt.tmp: Permission denied
sh: 1: ps: not found
mv: cannot stat '/home/jenkins/workspace/test@tmp/durable-b7fece0a/jenkins-result.txt.tmp': No such file or directory
```
<!-- more -->
## 问题排查

既然出现 Permission denied 肯定要从权限入手了，看错误信息是在工作目录发生的错误，因为 kubernetes-plugin 这个插件会将工作目录挂载出去，以保证所有容器都能访问，所以可能就是就是各个容器的权限不统一造成的，下边验证下这个猜想。

### 验证

我的 Jenkinsfile 如下：

```groovy
#!/usr/bin/env groovy
pipeline {
  agent {
    kubernetes {
        label "mypod-${UUID.randomUUID().toString()}"
        yaml """
apiVersion: v1
kind: Pod
metadata:
  name: jenkins-agents
spec:
  containers:
  - name: gradle
    image: gradle:4.9-jdk8-alpine
    command:
    - cat
    tty: true
    volumeMounts:
    - mountPath: /home/gradle/.gradle/caches
      name: gradle-caches
      readOnly: false
  volumes:
  - name: gradle-caches
    persistentVolumeClaim:
      claimName: gradle-caches
"""
    }
  }
    stages {
        stage('编译测试') {
            stages {
                stage('拉取代码') {
                    steps {
                        git credentialsId: 'gitlab-jenkins', url: 'xxxxxxxx'
                    }
                }
                stage('Gradle 编译打包') {
                    steps {
                        container('gradle') {
                            sh 'gradle build'
                        }
                    }
                }
            }
        }
    }
}
```

一共只用到两个容器：除了默认的 jnlp 就只有 gradle 了，所用镜像分别是 `jenkins/jnlp-slave:3.10-1` 和 `gradle:4.9-jdk8-alpine`。

首先查看下两个镜像默认用户的信息：

```shell
$ docker run --rm jenkins/jnlp-slave:3.10-1 id
uid=10000(jenkins) gid=10000(jenkins) groups=10000(jenkins)

$ docker run --rm gradle:4.9-jdk8-alpine id
uid=1000(gradle) gid=1000(gradle) groups=1000(gradle)
```

可以看到 jnpl 的 jenkins 用的 uid 和 gid 居然是 10000，而 gradle 的 gradle 用户的 uid 和 gid 为 1000。

为了弄清楚到底怎么回事，找到 Dockerfile 一探究竟，首先找到 [jenkins/jnlp-slave](https://github.com/jenkinsci/docker-jnlp-slave/blob/master/Dockerfile)

[jenkins/jnlp-slave]

```shell
FROM jenkins/slave:3.23-1
MAINTAINER Oleg Nenashev <o.v.nenashev@gmail.com>
LABEL Description="This is a base image, which allows connecting Jenkins agents via JNLP protocols" Vendor="Jenkins project" Version="3.23"

COPY jenkins-slave /usr/local/bin/jenkins-slave

ENTRYPOINT ["jenkins-slave"]
```

只是个空壳，找到 [jenkins/slave](https://github.com/jenkinsci/docker-slave/blob/master/Dockerfile)

```docker
FROM openjdk:8-jdk
MAINTAINER Oleg Nenashev <o.v.nenashev@gmail.com>

ARG user=jenkins
ARG group=jenkins
ARG uid=10000
ARG gid=10000

ENV HOME /home/${user}
RUN groupadd -g ${gid} ${group}
RUN useradd -c "Jenkins user" -d $HOME -u ${uid} -g ${gid} -m ${user}
LABEL Description="This is a base image, which provides the Jenkins agent executable (slave.jar)" Vendor="Jenkins project" Version="3.23"

ARG VERSION=3.23
ARG AGENT_WORKDIR=/home/${user}/agent

RUN curl --create-dirs -sSLo /usr/share/jenkins/slave.jar https://repo.jenkins-ci.org/public/org/jenkins-ci/main/remoting/${VERSION}/remoting-${VERSION}.jar \
  && chmod 755 /usr/share/jenkins \
  && chmod 644 /usr/share/jenkins/slave.jar

USER ${user}
ENV AGENT_WORKDIR=${AGENT_WORKDIR}
RUN mkdir /home/${user}/.jenkins && mkdir -p ${AGENT_WORKDIR}

VOLUME /home/${user}/.jenkins
VOLUME ${AGENT_WORKDIR}
WORKDIR /home/${user}
```

可以看到 Dockerfile 里指定的 uid 和 gid 确实是 10000，至于为什么是 10000 没有提到。

### 解决方案

既然已经找到了问题所在，那么只要把 gradle 镜像的 uid 和 gid 也改为 10000 应该就可以了，下面就试一下。

首先找到 [gradle 的原始 Dockerfile](https://github.com/keeganwitt/docker-gradle) 并修改如下：

```docker
FROM openjdk:8-jdk-alpine

CMD ["gradle"]

ENV GRADLE_HOME /opt/gradle
ENV GRADLE_VERSION 4.9

ARG GRADLE_DOWNLOAD_SHA256=e66e69dce8173dd2004b39ba93586a184628bc6c28461bc771d6835f7f9b0d28
RUN set -o errexit -o nounset \
	&& echo "Installing build dependencies" \
	&& apk add --no-cache --virtual .build-deps \
		ca-certificates \
		openssl \
		unzip \
	\
	&& echo "Downloading Gradle" \
	&& wget -O gradle.zip "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" \
	\
	&& echo "Checking download hash" \
	&& echo "${GRADLE_DOWNLOAD_SHA256} *gradle.zip" | sha256sum -c - \
	\
	&& echo "Installing Gradle" \
	&& unzip gradle.zip \
	&& rm gradle.zip \
	&& mkdir /opt \
	&& mv "gradle-${GRADLE_VERSION}" "${GRADLE_HOME}/" \
	&& ln -s "${GRADLE_HOME}/bin/gradle" /usr/bin/gradle \
	\
	&& apk del .build-deps \
	\
	&& echo "Adding gradle user and group" \
	&& addgroup -S -g 10000 gradle \
	&& adduser -D -S -G gradle -u 10000 -s /bin/ash gradle \
	&& mkdir /home/gradle/.gradle \
	&& chown -R gradle:gradle /home/gradle \
	\
	&& echo "Symlinking root Gradle cache to gradle Gradle cache" \
	&& ln -s /home/gradle/.gradle /root/.gradle

# Create Gradle volume
USER gradle
VOLUME "/home/gradle/.gradle"
WORKDIR /home/gradle

RUN set -o errexit -o nounset \
	&& echo "Testing Gradle installation" \
	&& gradle --version
```

*只是把 uid 和 gid 由 1000 改为 10000*

### 结果

镜像构建完成后使用新镜像重新 build 项目，问题解决！