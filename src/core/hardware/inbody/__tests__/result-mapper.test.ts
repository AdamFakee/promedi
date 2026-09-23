import { mapResultFields } from '../protocol/result-mapper'
import { RESULT_INDEX_MAP } from '../protocol/result-index-map'

describe('mapResultFields', () => {
  it('chuyển đổi mảng trường dữ liệu sang đối tượng InBodyResult hợp lệ', () => {
    // Tạo mảng giả lập 764 phần tử fill bằng '0'
    const mockFields = new Array(764).fill('0')

    // Điền một số chỉ số mẫu
    mockFields[RESULT_INDEX_MAP.inBodyId] = 'IB260S_001'
    mockFields[RESULT_INDEX_MAP.userId] = 'USER_123'
    mockFields[RESULT_INDEX_MAP.gender] = 'M'
    mockFields[RESULT_INDEX_MAP.height] = '175.5'
    mockFields[RESULT_INDEX_MAP.age] = '30'
    mockFields[RESULT_INDEX_MAP.weight] = '70.2'
    mockFields[RESULT_INDEX_MAP.testDate] = '2026.09.23'
    mockFields[RESULT_INDEX_MAP.testTime] = '10:30:00'
    mockFields[RESULT_INDEX_MAP.protein] = '12.4'
    mockFields[RESULT_INDEX_MAP.minerals] = '3.8'
    mockFields[RESULT_INDEX_MAP.bfm] = '14.5'
    mockFields[RESULT_INDEX_MAP.tbw] = '42.1'
    mockFields[RESULT_INDEX_MAP.ffm] = '55.7'
    mockFields[RESULT_INDEX_MAP.smm] = '32.1'
    mockFields[RESULT_INDEX_MAP.bmi] = '22.8'
    mockFields[RESULT_INDEX_MAP.pbf] = '20.6'
    mockFields[RESULT_INDEX_MAP.whr] = '0.85'
    mockFields[RESULT_INDEX_MAP.bmr] = '1650'
    mockFields[RESULT_INDEX_MAP.vfl] = '6'
    mockFields[RESULT_INDEX_MAP.inBodyScore] = '82'
    mockFields[RESULT_INDEX_MAP.smi] = '8.2'

    const result = mapResultFields(mockFields)

    expect(result.inBodyId).toBe('IB260S_001')
    expect(result.userId).toBe('USER_123')
    expect(result.gender).toBe('M')
    expect(result.height).toBe(175.5)
    expect(result.age).toBe(30)
    expect(result.weight).toBe(70.2)
    expect(result.testDate).toBe('2026.09.23')
    expect(result.testTime).toBe('10:30:00')
    expect(result.protein).toBe(12.4)
    expect(result.minerals).toBe(3.8)
    expect(result.bfm).toBe(14.5)
    expect(result.tbw).toBe(42.1)
    expect(result.ffm).toBe(55.7)
    expect(result.smm).toBe(32.1)
    expect(result.bmi).toBe(22.8)
    expect(result.pbf).toBe(20.6)
    expect(result.whr).toBe(0.85)
    expect(result.bmr).toBe(1650)
    expect(result.vfl).toBe(6)
    expect(result.inBodyScore).toBe(82)
    expect(result.smi).toBe(8.2)
  })

  it('chuyển các trường có giá trị "0" hoặc rỗng thành null', () => {
    const mockFields = new Array(764).fill('0')
    const result = mapResultFields(mockFields)

    expect(result.weight).toBeNull()
    expect(result.height).toBeNull()
    expect(result.smm).toBeNull()
    expect(result.bmi).toBeNull()
  })
})
