# Mô-đun Quản Lý Phần Cứng & Thiết Bị Y Tế (Hardware Core Layer)

Thư mục này chứa toàn bộ các lớp Abstraction Layer, Protocol Drivers và Device Adapters phục vụ kết nối phần cứng trên Kiosk **ProMedi**.

---

## 1. Danh Mục Mô-đun Phần Cứng

| Mô-đun / Tệp | Trách nhiệm                                                         |  Chạm Vào/Ra (I/O)   |
| :----------- | :------------------------------------------------------------------ | :------------------: |
| `inbody/`    | SDK driver kết nối máy đo thành phần cơ thể InBody 260S (Port 2004) | ⚠️/🌐 **I/O Socket** |
| `index.ts`   | Public Barrel Export cho toàn bộ Hardware Layer                     |     ❌ Zero I/O      |

---

## 2. Cách Sử Dụng Trong React Native UI / State Machine

```typescript
import { useInBodySession } from '@/core/hardware'

// Sử dụng trực tiếp Custom Hook tích hợp State Machine XState v5
const { state, progress, result, start, disconnect } = useInBodySession()
```
