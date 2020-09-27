---
title: Spring Boot Admin 集成自定义监控告警
date: 2018-05-19 14:41
tags: 
  - Spring Boot
  - Java
  - DevOps
---

[Spring Boot Admin](https://github.com/codecentric/spring-boot-admin) 是一个社区项目，可以用来监控和管理 Spring Boot 应用并且提供 UI，详细可以参考 [官方文档](http://codecentric.github.io/spring-boot-admin/1.5.7/#getting-started)。

Spring Boot Admin 本身提供监控告警功能，但是默认只提供了 Hipchat、Slack 等国外流行的通讯软件的集成，虽然也有邮件通知，不过考虑到使用体检决定二次开发增加 [钉钉](https://www.dingtalk.com) 通知。

本文基于 Spring Boot Admin 目前最新版 1.5.7。
<!-- more -->
## 准备工作
1. Spring Boot Admin Server，参考文档 [http://codecentric.github.io/spring-boot-admin/1.5.7/#getting-started](http://codecentric.github.io/spring-boot-admin/1.5.7/#getting-started)
2. 钉钉自定义机器人，参考文档 [https://open-doc.dingtalk.com/docs/doc.htm?spm=a219a.7629140.0.0.64Ddtm&treeId=257&articleId=105735&docType=1](https://open-doc.dingtalk.com/docs/doc.htm?spm=a219a.7629140.0.0.64Ddtm&treeId=257&articleId=105735&docType=1)

## 参考自带通知源码
由于官方文档上并没有增加自定义通知相关的文档，所以我们参考一下 Slack 通知源码 `SlackNotifier.java`。

源码比较长就不全部贴了，看一下关键部分：
```java
public class SlackNotifier extends AbstractStatusChangeNotifier
```
```java
protected void doNotify(ClientApplicationEvent event) throws Exception {
    this.restTemplate.postForEntity(this.webhookUrl, this.createMessage(event), Void.class);
}
```
可以看到流程还是比较简单的，继承 AbstractStatusChangeNotifier 类，实现了 doNotify 方法，当应用状态改变的时候会回调 doNotify 方法。
## 实现钉钉通知
DingTalkNotifier.java
```java
public class DingTalkNotifier extends AbstractStatusChangeNotifier {
    private final SpelExpressionParser parser = new SpelExpressionParser();
    private RestTemplate restTemplate = new RestTemplate();
    private String webhookToken;
    private String atMobiles;
    private String msgtype = "markdown";
    private String title = "服务告警";
    private Expression message;

    public DingTalkNotifier() {
        this.message = this.parser.parseExpression("**#{application.name}** (#{application.id}) is **#{to.status}**", ParserContext.TEMPLATE_EXPRESSION);
    }

    @Override
    protected void doNotify(ClientApplicationEvent event) {
        this.restTemplate.postForEntity(this.webhookToken, this.createMessage(event), Void.class);
    }

    private HttpEntity<Map<String, Object>> createMessage(ClientApplicationEvent event) {
        Map<String, Object> messageJson = new HashMap<>();
        HashMap<String, String> params = new HashMap<>();
        params.put("text", this.getMessage(event));
        params.put("title", this.title);
        messageJson.put("dinggroup", this.dingGroup);
        messageJson.put("atMobiles", this.atMobiles);
        messageJson.put("msgtype", this.msgtype);
        messageJson.put(this.msgtype, params);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON_UTF8);
        return new HttpEntity<>(messageJson, headers);
    }

    private String getAtMobilesString(String s) {
        StringBuilder atMobiles = new StringBuilder();
        String[] mobiles = s.split(",");
        for (String mobile : mobiles) {
            atMobiles.append("@").append(mobile);
        }
        return atMobiles.toString();
    }

    private String getMessage(ClientApplicationEvent event) {
        return this.atMobiles == null ? this.message.getValue(event, String.class) : this.message.getValue(event, String.class) + "\n >" + this.getAtMobilesString(this.atMobiles);
    }

    public void setRestTemplate(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String getWebhookToken() {
        return webhookToken;
    }

    public void setWebhookToken(String webhookToken) {
        this.webhookToken = webhookToken;
    }

    public String getAtMobiles() {
        return atMobiles;
    }

    public void setAtMobiles(String atMobiles) {
        this.atMobiles = atMobiles;
    }

    public String getMsgtype() {
        return msgtype;
    }

    public void setMsgtype(String msgtype) {
        this.msgtype = msgtype;
    }

    public Expression getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = this.parser.parseExpression(message, ParserContext.TEMPLATE_EXPRESSION);
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
```
代码逻辑也比较简单就不一一解释了。
## 增加钉钉通知自动配置
DingTalkNotifierConfiguration.java
```java
@Configuration
@ConditionalOnProperty(
        prefix = "spring.boot.admin.notify.dingtalk",
        name = {"webhook-token"}
)
@AutoConfigureBefore({NotifierConfiguration.NotifierListenerConfiguration.class, NotifierConfiguration.CompositeNotifierConfiguration.class})
public class DingTalkNotifierConfiguration {
    public DingTalkNotifierConfiguration() {
    }

    @Bean
    @ConditionalOnMissingBean
    @ConfigurationProperties(prefix = "spring.boot.admin.notify.dingtalk")
    public DingTalkNotifier dingTalkNotifier() {
        return new DingTalkNotifier();
    }

}

```
大概解释下此配置类的主要作用：
1. 当配置了 `spring.boot.admin.notify.dingtalk.webhook-token` 的时候此配置类生效。
2. 将 `spring.boot.admin.notify.dingtalk` 下的配置注入到 `DingTalkNotifier` 生成的 Bean 中。
3. 指定了此配置配生效的时间以及 Bean 生效的条件。

*关键在于类和 Bean 上的几个注解，但这不是本文重点不展开说了。*
## 增加相关配置
```yaml
spring:
  boot:
    admin:
      notify:
        dingtalk:
          enabled: true
          webhook-token: https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxxxx

```

然后当项目状态改变的时候就可以在钉钉收到消息了。