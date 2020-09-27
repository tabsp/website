---
title: 解决 Elasticsearch 查询时 Fielddata is disabled on text fields by default 错误
date: 2020-04-28 11:17
tags: 
  - Elastic
---
## 问题描述

以下过程基于 Elasticsearch 7.3

Elasticsearch 启动后无法查询，检查日志发现这样一行日志：

```
Caused by: java.lang.IllegalArgumentException: Fielddata is disabled on text fields by default. Set fielddata=true on [type] in order to load fielddata in memory by uninverting the inverted index. Note that this can however use significant memory. Alternatively use a keyword field instead.
```

日志其实已经说得很清楚了，默认情况下 text 类型的字段 fielddata 被禁用。官方文档在[这里](https://www.elastic.co/guide/en/elasticsearch/reference/current/fielddata.html#fielddata-disabled-text-fields)。


继续排查日志发现：

```
Failed to execute [SearchRequest{searchType=QUERY_THEN_FETCH, indices=[.kibana], indicesOptions=IndicesOptions......
```

是启动 kibana 时报的错。


## 解决方案

根据文档说明将 [type] 字段 fielddata 设置为 true：

```bash
curl -X PUT "localhost:9200/.kibana/_mapping?pretty" -H 'Content-Type: application/json' -d'
{
  "properties": {
    "type": {
      "type":     "text",
      "fielddata": true
    }
  }
}
'
```

## 总结

首先找到是哪个索引下的哪个字段报错，此例中就是 .kibana 索引的 type 字段，然后将对应字段 fielddata 设置为 true 解决问题。

修改配置 ：

```bash
curl -X PUT "localhost:9200/[modify_this_index]/_mapping?pretty" -H 'Content-Type: application/json' -d'
{
  "properties": {
    "[modify_this_field]": {
      "type":     "text",
      "fielddata": true
    }
  }
}
'
```

验证结果：

```bash
curl -X GET "localhost:9200/[modify_this_index]/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "aggs": {
    "all_[modify_this_field]": {
      "terms": { "field": "[modify_this_field]" }
    }
  }
}
'
```

*将 [modify_this_index] 和 [modify_this_field] 修改为对应的索引和字段即可。*
