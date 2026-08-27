export const SAMPLE_FILENAME = "architecture.md";

export const ERROR_SAMPLE_FILENAME = "mermaid-errors.md";

export const ERROR_SAMPLE_DOC = `# Mermaid 语法错误示例

下面两段是故意写坏的图。整页应继续可读：错误留在原位，并带上原因和源码。点右上角书本图标可回到完整架构示例。

## 1. 流程图：箭头写成了非法符号

Mermaid 没有 \`-->>>\` 这种箭头。


\`\`\`mermaid
flowchart TB
  A[创建会话] --> B[选择支付方式]
  B -->>> C[提交支付]

\`\`\`

## 2. 时序图：消息漏了冒号

Mermaid 时序消息必须是 \`A->>B: 文本\`，下面少了冒号。

\`\`\`mermaid
sequenceDiagram
  participant UI as 收银台
  participant Txn as 交易服务
  UI->>Txn CreatePayment
  Txn-->>UI accepted
\`\`\`
`;

export const SAMPLE_DOC = `# 支付平台架构说明

一份给审阅用的技术文档。下面几张图都是 AI 生成的 Mermaid —— **点击任意图表即可全屏放大、拖拽、滚轮缩放**。这正是 Vellum 要解决的阅读问题：复杂架构图不该被挤在文档栏宽里。

## 总览

支付平台把收银台、风控、账务和渠道网关拆开。读这份文档时先看流量怎么进系统，再看一笔支付在时序上如何落账。

| 子系统 | 职责 | 关键 SLA |
| --- | --- | --- |
| 收银台 | 会话、支付方式、前端态 | P99 < 200ms |
| 风控引擎 | 同步决策 + 异步补查 | 同步 < 80ms |
| 账务 | 分录、对账、清算 | 最终一致 |
| 渠道网关 | 银行 / 钱包适配 | 幂等 + 超时重试 |

> 大图请点进去看。内联预览只负责定位，细节在全屏里。

## 流量架构

点击下图：节点很多，默认栏宽里字会糊。全屏后滚轮放大、拖拽平移即可。

\`\`\`mermaid
flowchart TB
  subgraph Clients["客户端"]
    App[App / H5]
    Mini[小程序]
    SDK[商户 SDK]
  end

  subgraph Edge["接入"]
    CDN[CDN]
    WAF[WAF]
    GW[API Gateway]
  end

  subgraph Checkout["收银台集群"]
    Sess[会话服务]
    PayUI[支付编排]
    Token[支付 Token]
  end

  subgraph Risk["风控"]
    Sync[同步决策]
    Async[异步补查]
    Feat[特征仓库]
  end

  subgraph Core["交易核心"]
    Txn[交易服务]
    Ledger[账务]
    Idem[幂等键]
    Outbox[Outbox]
  end

  subgraph Channels["渠道"]
    Bank[银行卡]
    Wallet[钱包]
    APM[本地支付]
    Rec[对账文件]
  end

  subgraph Data["数据"]
    PG[(Postgres)]
    Redis[(Redis)]
    Kafka[Kafka]
    S3[(对象存储)]
  end

  App --> CDN
  Mini --> CDN
  SDK --> GW
  CDN --> WAF --> GW
  GW --> Sess
  GW --> PayUI
  PayUI --> Token
  PayUI --> Sync
  Sync --> Feat
  Sync --> Txn
  Txn --> Idem
  Txn --> Ledger
  Txn --> Outbox
  Outbox --> Kafka
  Kafka --> Async
  Kafka --> Bank
  Kafka --> Wallet
  Kafka --> APM
  Bank --> Rec
  Wallet --> Rec
  Rec --> S3
  Ledger --> PG
  Sess --> Redis
  Token --> Redis
  Idem --> Redis
  Async --> Feat
\`\`\`

## 一笔支付的时序

从用户点「确认支付」到渠道回执。同步路径必须短；渠道交互走 outbox，避免网关线程被拖死。

\`\`\`mermaid
sequenceDiagram
  actor User as 用户
  participant UI as 收银台
  participant Risk as 风控
  participant Txn as 交易服务
  participant Ledger as 账务
  participant GW as 渠道网关
  participant Bank as 银行

  User->>UI: 确认支付
  UI->>Risk: 同步决策
  Risk-->>UI: pass / review / reject
  alt reject
    UI-->>User: 拒绝
  else pass
    UI->>Txn: CreatePayment
    Txn->>Txn: 幂等键
    Txn->>Ledger: 预记账
    Ledger-->>Txn: ok
    Txn->>GW: 提交渠道
    GW->>Bank: 授权请求
    Bank-->>GW: 处理中
    GW-->>Txn: accepted
    Txn-->>UI: 处理中
    UI-->>User: 等待结果
    Bank-->>GW: 授权成功
    GW->>Txn: 异步回执
    Txn->>Ledger: 确认分录
    Txn-->>UI: 成功
    UI-->>User: 支付完成
  end
\`\`\`

## 账务模型

\`\`\`mermaid
erDiagram
  MERCHANT ||--o{ PAYMENT : accepts
  PAYMENT ||--|{ LEDGER_ENTRY : posts
  PAYMENT ||--o{ ATTEMPT : retries
  ATTEMPT }o--|| CHANNEL : via
  PAYMENT ||--o{ REFUND : may-have
  MERCHANT {
    string merchant_id PK
    string name
    string status
  }
  PAYMENT {
    string payment_id PK
    string merchant_id FK
    int amount
    string currency
    string state
    string idempotency_key
  }
  LEDGER_ENTRY {
    string entry_id PK
    string payment_id FK
    string account
    string direction
    int amount
  }
  ATTEMPT {
    string attempt_id PK
    string payment_id FK
    string channel_id FK
    string status
  }
  CHANNEL {
    string channel_id PK
    string kind
  }
  REFUND {
    string refund_id PK
    string payment_id FK
    int amount
    string state
  }
\`\`\`

## 状态机

\`\`\`mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Risking: 提交风控
  Risking --> Declined: 拒绝
  Risking --> Authorized: 渠道授权
  Risking --> Pending: 渠道处理中
  Pending --> Authorized: 回执成功
  Pending --> Failed: 回执失败 / 超时
  Authorized --> Captured: 请款
  Authorized --> Voided: 撤销
  Captured --> Refunding: 退款
  Refunding --> Refunded: 全额退
  Refunding --> Captured: 部分退完成
  Declined --> [*]
  Failed --> [*]
  Voided --> [*]
  Refunded --> [*]
  Captured --> [*]
\`\`\`

## 实现备忘

收银台只编排，不持有资金事实。资金事实在账务；渠道适配器必须**幂等**。

\`\`\`ts
export async function createPayment(input: CreatePayment) {
  const existing = await payments.findByIdempotency(input.merchantId, input.key);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    const payment = await tx.payments.insert(input);
    await tx.ledger.hold(payment);
    await tx.outbox.enqueue("channel.submit", payment.id);
    return payment;
  });
}
\`\`\`

- [x] 幂等键在 Redis + 唯一索引双写
- [x] 渠道回执验签
- [ ] 对账差异自动工单
- [ ] 多币种日内估值

## 阅读提示

1. 先看流量架构，确认入口和数据面。
2. 再看时序，确认同步 / 异步边界。
3. 最后用 ER 和状态机核对记账语义。

Vellum 不会改你的 Markdown，只负责把它读清楚。
`;
