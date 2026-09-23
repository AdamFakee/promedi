# Đặc Tả Kiến Trúc SDK Kết Nối Máy Đo InBody 260S (Architecture Spec & ADR)

- **Mô-đun**: SDK Kết Nối & Điều Khiển Thiết Bị Y Tế InBody 260S
- **Vị trí trong mã nguồn**: `src/core/hardware/inbody/`
- **Tầng kiến trúc**: Core Layer (Layer 2) - Business Logic & Hardware Drivers
- **Đối tượng triển khai**: Kiosk Sumi mini K2 (Sunmi K2 mini - Android Custom Dev Client)
- **Chuẩn giao tiếp**: TCP/IP Socket (Port `2004`) / Open Protocol (ASCII over Hex Frame)
- **Tài liệu tham chiếu giao thức gốc**: [`docs/hard-ware/inbody260s-open-protocol-spec.md`](file:///d:/promedi/docs/hard-ware/inbody260s-open-protocol-spec.md)

---

## 🎯 Scope & Boundaries (Ranh Giới Trách Nhiệm)

### Mô-đun LÀM GÌ (In Scope):

- Tách biệt 4 phân lớp: `Transport Layer` ➔ `Protocol Layer` ➔ `Client API` ➔ `State Machine (XState v5)` ➔ `Device Adapter`.
- Đóng gói và cắt khung truyền nhị phân an toàn trên luồng TCP (Streaming-Safe, STX `0x02` / ETX `0x03` / ESC `0x1B`).
- Mã hóa `latin1` bảo toàn byte nhị phân thô, kiểm soát throw Error nghiêm ngặt với ký tự non-ASCII (> 0x7F) trong `FrameCodec.encode`.
- Chuẩn hóa thông tin cá nhân khách hàng tiếng Việt (`sanitizeAscii`) trước khi gửi lệnh `INFO` (`0x75`).
- Thực hiện Polling STATUS 500ms, tự động retry và phát hiện timeout 3 lần liên tiếp không nhận ETX.
- Thực hiện tự động gửi lệnh `LOCK` (`0x6C`) khi bắt đầu và `UNLOCK` khi kết thúc/timeout.
- Bóc tách mảng 764 fields từ lệnh `RESULT` (`0x64`) và map sang đối tượng `InBodyResult` chuẩn hóa.

### Mô-đun KHÔNG LÀM GÌ (Out of Scope):

- **KHÔNG quản lý UI / Layout / Styles**: Toàn bộ giao diện hiển thị nằm ở Layer 3 (`src/features/measure-inbody/`).
- **KHÔNG quản lý lưu trữ lâu dài SQLite / WatermelonDB**: Việc ghi DB do FSM tổng Kiosk (`health-session.machine.ts`) hoặc API Layer đảm nhận.
- **KHÔNG phát âm thanh trực tiếp**: Việc phát thoại hướng dẫn sử dụng `VoiceEngine` (`src/core/voice-engine/`).
- **KHÔNG hardcode singleton rườm rà**: Quản lý instance thông qua React Hook `useInBodySession()` hoặc XState Actor Lifecycle.

---

## 1. Đường Ống & Luồng Dữ Liệu (Pipeline, FSM & Sequence Diagrams)

### 1.1 Mô Hình Phân Lớp Kiến Trúc 5 Tầng (Layered Architecture Diagram)

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: UI Screen (`src/features/measure-inbody/`)        │
│  - Render ProgressBar, Voice cues, Toast thông báo           │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Custom Hook & Device Adapter                       │
│  - `useInBodySession()` Hook & `InBodyDevice` Adapter        │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: State Machine Actor (`inbody-session.machine.ts`)  │
│  - XState v5 FSM: Polling STATUS 500ms, Retry, Auto-Unlock   │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Public SDK Client (`InBodyClient`)                 │
│  - Quản lý giao tiếp Half-Duplex, Mutex Lock                 │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Protocol Layer (`FrameCodec` / `Commands`)         │
│  - STX/ETX Frame parser, throw non-ASCII, sanitizeAscii      │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: Transport Layer (`TcpTransport`)                   │
│  - Port contract `DeviceTransport`, `latin1` byte encoding   │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Trạng Thái State Machine XState v5 (`inbody-session.machine.ts`)

```mermaid
stateDiagram-v2
    [*] --> disconnected
    disconnected --> connecting: CONNECT
    connecting --> locking: TCP Connected
    connecting --> disconnected: Error / Timeout
    locking --> ready: LOCK '1' Ack
    locking --> ready: Lock Warning
    ready --> waitingForWeight: START (patientInfo)

    state waitingForWeight {
        [*] --> pollingStatusWeight
        pollingStatusWeight --> sendingInfo: STATUS = '1' (Weight Done)
        pollingStatusWeight --> deviceError: STATUS = '5' (Error)
        pollingStatusWeight --> transportTimeout: 3x No-ETX
    }

    sendingInfo --> measuring: INFO Ack
    sendingInfo --> deviceError: INFO Fail

    state measuring {
        [*] --> pollingStatusBIA
        pollingStatusBIA --> measuring: STATUS = '2' (Progress +5%)
        pollingStatusBIA --> fetchingResult: STATUS = '3' (Completed)
        pollingStatusBIA --> deviceError: STATUS = '5' (Error)
        pollingStatusBIA --> transportTimeout: 3x No-ETX
    }

    fetchingResult --> completed: RESULT Parsed (0..763)
    fetchingResult --> deviceError: RESULT Fail

    deviceError --> waitingForWeight: SKIP Ack (Clear error screen)

    transportTimeout --> unlockingThenDisconnect: Entry Action (Sound)

    completed --> ready: RESET
    completed --> unlockingThenDisconnect: DISCONNECT

    unlockingThenDisconnect --> disconnecting: UNLOCK Ack
    disconnecting --> disconnected: Closed
```

---

## 2. Bảng Cấu Trúc Dữ Liệu & API Payloads

### 2.1 Interface Thông Tin Khách Hàng (`PatientInfo`)

```typescript
export interface PatientInfo {
  /** Mã định danh duy nhất (Tối đa 14 ký tự ASCII) */
  id: string
  /** Giới tính: 'M' (Nam) hoặc 'F' (Nữ) */
  gender: 'M' | 'F'
  /** Chiều cao (cm), dải đo hợp lệ: 50.0 - 250.0 cm */
  heightCm: number
  /** Tuổi khách hàng, dải hợp lệ: 3 - 99 tuổi */
  age: number
}
```

### 2.2 Schema Kết Quả Phân Tích BIA (`InBodyResult`)

```typescript
export interface InBodyResult {
  inBodyId: string | null
  userId: string | null
  gender: 'M' | 'F' | null
  height: number | null
  age: number | null
  weight: number | null
  testDate: string | null
  testTime: string | null
  protein: number | null
  minerals: number | null
  bfm: number | null // Body Fat Mass (kg)
  tbw: number | null // Total Body Water (L)
  ffm: number | null // Fat Free Mass (kg)
  smm: number | null // Skeletal Muscle Mass (kg)
  bmi: number | null // Body Mass Index (kg/m²)
  pbf: number | null // Percent Body Fat (%)
  whr: number | null // Waist-Hip Ratio
  bmr: number | null // Basal Metabolic Rate (kcal)
  vfl: number | null // Visceral Fat Level (1~20)
  inBodyScore: number | null // Điểm số InBody (Thang 100)
  smi: number | null // Skeletal Muscle Index (kg/m²)
  segmental: {
    ffmRightArm: number | null
    ffmLeftArm: number | null
    ffmTrunk: number | null
    ffmRightLeg: number | null
    ffmLeftLeg: number | null
    bfmRightArm: number | null
    bfmLeftArm: number | null
    bfmTrunk: number | null
    bfmRightLeg: number | null
    bfmLeftLeg: number | null
  }
  control: {
    targetWeight: number | null
    weightControl: number | null
    bfmControl: number | null
    ffmControl: number | null
  }
  raw: string[] // Mảng dữ liệu thô (Fields 0..763)
}
```

---

## 3. Giải Trình Lý Do Thiết Kế (Design Rationale / HOW & WHY)

### 3.1 Tại Sao Không Dùng `utf8` Cho TCP Socket?

- Payload giao thức InBody sử dụng các byte điều khiển nhị phân Hex như `STX (0x02)`, `ETX (0x03)`, `ESC (0x1B)`.
- Khi dùng `utf8` làm encoding cho Socket, các byte không phải ký tự UTF-8 hợp lệ sẽ bị UTF-8 decoder thay thế thành `0xFFFD` (Replacement Character) hoặc biến dạng byte, làm hỏng hoàn toàn khung truyền.
- **Giải pháp**: Bắt buộc sử dụng `latin1` (byte-transparent 1:1 mapping với `Uint8Array`).

### 3.2 Kỹ Thuật Sanitize Tiếng Việt Cho ID Khách Hàng (`sanitizeAscii`)

- Ký tự tiếng Việt có dấu khi dùng `charCodeAt()` sẽ sinh mã Unicode UTF-16 lớn hơn 255 (ví dụ `'Ệ'` = `0x1EC6`). Nếu ép kiểu trực tiếp vào `Uint8Array`, JavaScript sẽ lấy `mod 256` sinh ra byte sai một cách âm thầm.
- Đặc biệt, chữ `'Đ'` và `'đ'` trong Unicode là chữ cái độc lập, không bị phân tách bởi Unicode NFD decomposition (`normalize('NFD')`).
- **Giải pháp**:
  1. Map thủ công `'Đ'` ➔ `'D'` và `'đ'` ➔ `'d'`.
  2. Thực hiện `normalize('NFD')` để tách các dấu thanh.
  3. Xóa dải diacritics `[\u0300-\u036f]`.
  4. Lọc dải ký tự an toàn `[^a-zA-Z0-9_ -]` và cắt đúng 14 Bytes.
  5. Trong `FrameCodec.encode()`, nếu phát hiện byte $> 0x7F$, SDK sẽ throw `Error` rõ ràng thay vì nuốt lỗi.

### 3.3 Tại Sao Không Hardcode `DeviceManager` Singleton Rườm Rà?

- Tầng UI Kiosk chạy trong một React Tree duy nhất. Khởi tạo instance thông qua Custom Hook `useInBodySession()` hoặc XState Actor giúp:
  1. Dễ dàng Unit Test & Mocking từng component độc lập mà không bị dính State Pollution giữa các test run.
  2. Quản lý vòng đời kết nối an toàn: Tự động giải phóng socket khi rời màn hình hoặc timeout 60s.
  3. Tuân thủ tuyệt đối quy tắc Clean Code: Không tạo các lớp bọc trung gian (Indirection Layer) thừa thãi khi không có nhu cầu đa luồng ngoài React Tree.

### 3.4 Cơ Chế Bán Song Công (Half-Duplex Mutex Lock)

- InBody 260S có độ trễ phản hồi từ 400ms đến 500ms.
- Trong `InBodyClient.sendAndWaitFrame()`, cờ `isProcessing` được bật để reject/lock mọi yêu cầu gửi lệnh mới cho tới khi nhận đủ byte `ETX` hoặc timeout. Điều này ngăn chặn hiện tượng chồng chéo câu lệnh (Command Overlap) gây treo máy InBody.

---

## 🛠️ 4. Danh Mục Mã Nguồn Triển Khai (Code Implementation Mapping)

| Phân lớp Module       | Đường dẫn tệp                                                                                                                                 | Trách nhiệm chính                                    |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| **Types**             | [`src/core/hardware/inbody/types/inbody.types.ts`](file:///d:/promedi/src/core/hardware/inbody/types/inbody.types.ts)                         | TypeScript Interfaces & Error codes                  |
| **Transport**         | [`src/core/hardware/inbody/transport/tcp-transport.ts`](file:///d:/promedi/src/core/hardware/inbody/transport/tcp-transport.ts)               | Socket TCP Client Port 2004 (`latin1`)               |
| **Protocol Codec**    | [`src/core/hardware/inbody/protocol/frame-codec.ts`](file:///d:/promedi/src/core/hardware/inbody/protocol/frame-codec.ts)                     | Cắt khung STX/ETX, Throw Non-ASCII                   |
| **Command Builders**  | [`src/core/hardware/inbody/protocol/commands.ts`](file:///d:/promedi/src/core/hardware/inbody/protocol/commands.ts)                           | Dựng gói tin ASCII Hex (`STATUS`, `INFO`, `LOCK`...) |
| **Result Mapper**     | [`src/core/hardware/inbody/protocol/result-mapper.ts`](file:///d:/promedi/src/core/hardware/inbody/protocol/result-mapper.ts)                 | Mapping mảng 0..763 sang `InBodyResult`              |
| **Public SDK Client** | [`src/core/hardware/inbody/client/inbody-client.ts`](file:///d:/promedi/src/core/hardware/inbody/client/inbody-client.ts)                     | Half-Duplex Mutex Lock Client API                    |
| **State Machine**     | [`src/core/hardware/inbody/machine/inbody-session.machine.ts`](file:///d:/promedi/src/core/hardware/inbody/machine/inbody-session.machine.ts) | XState v5 Actor điều phối luồng đo & Polling         |
| **Device Adapter**    | [`src/core/hardware/inbody/device/inbody.device.ts`](file:///d:/promedi/src/core/hardware/inbody/device/inbody.device.ts)                     | Generic Device Adapter cho Kiosk                     |
| **React Hook**        | [`src/core/hardware/inbody/hooks/use-inbody-session.ts`](file:///d:/promedi/src/core/hardware/inbody/hooks/use-inbody-session.ts)             | React Hook cho UI Kiosk                              |
| **Sanitize Utility**  | [`src/core/hardware/inbody/utils/sanitize-ascii.ts`](file:///d:/promedi/src/core/hardware/inbody/utils/sanitize-ascii.ts)                     | Xử lý Tiếng Việt có dấu an toàn cho InBody           |
| **Unit Tests**        | [`src/core/hardware/inbody/__tests__/`](file:///d:/promedi/src/core/hardware/inbody/__tests__/)                                               | 6 Test Suites (26 Unit Tests PASSED)                 |

---

## 🧪 5. Chiến Lược Kiểm Thử Unit Test (Testing Strategy & Results)

Mô-đun SDK được bảo vệ bởi **6 Test Suites (26 Unit Tests)** chạy tự động qua Jest với tỷ lệ đạt **100% Pass Rate**.

### 5.1 Danh Mục Báo Cáo Unit Test (`src/core/hardware/inbody/__tests__/`)

| Test Suite (File)                | Số Test Cases | Nội dung & Kịch bản nghiệm thu                                                                                                                                                                                              |
| :------------------------------- | :-----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sanitize-ascii.test.ts`         |    5 Tests    | • Chuyển đổi tên tiếng Việt có dấu sang ASCII (VD: `'Nguyễn Văn Đạt'` ➔ `'Nguyen Van Dat'`).<br/>• Xử lý đặc thù chữ `'Đ'` / `'đ'`.<br/>• Cắt chuỗi theo `maxLen = 14`.                                                     |
| `frame-codec.test.ts`            |    5 Tests    | • Đóng gói STX/ETX/ESC.<br/>• Bóc tách TCP Streaming: Phân mảnh gói tin (1 frame cắt 2 chunks), dính gói (2 frames trong 1 chunk), loại bỏ byte rác trước STX.<br/>• Throw Error khi tham số chứa ký tự non-ASCII (> 0x7F). |
| `result-mapper.test.ts`          |    2 Tests    | • Map mảng 764 fields Hex ASCII sang object `InBodyResult`.<br/>• Ép kiểu số thực và xử lý ô dữ liệu rỗng/`'0'` thành `null`.                                                                                               |
| `commands.test.ts`               |    6 Tests    | • Kiểm tra 6 hàm dựng câu lệnh Hex ASCII (`STATUS`, `INFO`, `LOCK`, `RESULT`, `SKIP`, `SET_TIME`).                                                                                                                          |
| `inbody-client.test.ts`          |    3 Tests    | • Sử dụng `MockTransport` giả lập InBody.<br/>• Kiểm tra cờ Mutex Lock Half-Duplex.<br/>• Kiểm tra Timeout ngắt kết nối.                                                                                                    |
| `inbody-session.machine.test.ts` |    5 Tests    | • Kiểm tra State Machine XState v5: `disconnected` ➔ `connecting` ➔ `ready` ➔ `waitingForWeight` ➔ `sendingInfo` ➔ `measuring` ➔ `fetchingResult` ➔ `completed`.<br/>• Kiểm tra khôi phục lỗi STATUS `35` qua lệnh `SKIP`.  |

### 5.2 Lệnh Thực Thi Kiểm Trụ

```bash
# Chạy toàn bộ Unit Test của InBody SDK
npx jest src/core/hardware/inbody/__tests__

# Kiểm tra TypeScript strict mode (0 Errors)
npx tsc --noEmit
```
