/**
 * Chuyển đổi mảng trường dữ liệu (fields string[]) từ lệnh RESULT (0x64) thành InBodyResult object.
 * @module src/core/hardware/inbody/protocol/result-mapper.ts
 */

import { RESULT_INDEX_MAP } from './result-index-map'
import type { InBodyResult, InBodyGender } from '../types/inbody.types'

/** Helper chuyển đổi chuỗi số an toàn sang number (trả về null nếu trống hoặc '0') */
const toNumber = (v: string | undefined): number | null => {
  if (v === undefined || v === '0' || v.trim() === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/**
 * Mapper chuyển mảng dữ liệu thô sang InBodyResult
 */
export function mapResultFields(fields: string[]): InBodyResult {
  const at = (idx: number): string | undefined => fields[idx]

  const rawGender = at(RESULT_INDEX_MAP.gender)
  const gender: InBodyGender | null = rawGender === 'M' || rawGender === 'F' ? rawGender : null

  return {
    inBodyId: at(RESULT_INDEX_MAP.inBodyId) ?? null,
    userId: at(RESULT_INDEX_MAP.userId) ?? null,
    gender,
    height: toNumber(at(RESULT_INDEX_MAP.height)),
    age: toNumber(at(RESULT_INDEX_MAP.age)),
    weight: toNumber(at(RESULT_INDEX_MAP.weight)),
    testDate: at(RESULT_INDEX_MAP.testDate) ?? null,
    testTime: at(RESULT_INDEX_MAP.testTime) ?? null,
    protein: toNumber(at(RESULT_INDEX_MAP.protein)),
    minerals: toNumber(at(RESULT_INDEX_MAP.minerals)),
    bfm: toNumber(at(RESULT_INDEX_MAP.bfm)),
    tbw: toNumber(at(RESULT_INDEX_MAP.tbw)),
    ffm: toNumber(at(RESULT_INDEX_MAP.ffm)),
    smm: toNumber(at(RESULT_INDEX_MAP.smm)),
    bmi: toNumber(at(RESULT_INDEX_MAP.bmi)),
    pbf: toNumber(at(RESULT_INDEX_MAP.pbf)),
    whr: toNumber(at(RESULT_INDEX_MAP.whr)),
    bmr: toNumber(at(RESULT_INDEX_MAP.bmr)),
    vfl: toNumber(at(RESULT_INDEX_MAP.vfl)),
    inBodyScore: toNumber(at(RESULT_INDEX_MAP.inBodyScore)),
    smi: toNumber(at(RESULT_INDEX_MAP.smi)),
    segmental: {
      ffmRightArm: toNumber(at(RESULT_INDEX_MAP.ffmRightArm)),
      ffmLeftArm: toNumber(at(RESULT_INDEX_MAP.ffmLeftArm)),
      ffmTrunk: toNumber(at(RESULT_INDEX_MAP.ffmTrunk)),
      ffmRightLeg: toNumber(at(RESULT_INDEX_MAP.ffmRightLeg)),
      ffmLeftLeg: toNumber(at(RESULT_INDEX_MAP.ffmLeftLeg)),
      bfmRightArm: toNumber(at(RESULT_INDEX_MAP.bfmRightArm)),
      bfmLeftArm: toNumber(at(RESULT_INDEX_MAP.bfmLeftArm)),
      bfmTrunk: toNumber(at(RESULT_INDEX_MAP.bfmTrunk)),
      bfmRightLeg: toNumber(at(RESULT_INDEX_MAP.bfmRightLeg)),
      bfmLeftLeg: toNumber(at(RESULT_INDEX_MAP.bfmLeftLeg)),
    },
    control: {
      targetWeight: toNumber(at(RESULT_INDEX_MAP.targetWeight)),
      weightControl: toNumber(at(RESULT_INDEX_MAP.weightControl)),
      bfmControl: toNumber(at(RESULT_INDEX_MAP.bfmControl)),
      ffmControl: toNumber(at(RESULT_INDEX_MAP.ffmControl)),
    },
    raw: fields,
  }
}
