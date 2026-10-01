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
    mobileNumber: at(RESULT_INDEX_MAP.mobileNumber) ?? null,
    obesityDegree: toNumber(at(RESULT_INDEX_MAP.obesityDegree)),
    growthScore: toNumber(at(RESULT_INDEX_MAP.growthScore)),
    recommendedEnergy: toNumber(at(RESULT_INDEX_MAP.recommendedEnergy)),
    impedanceCheck: at(RESULT_INDEX_MAP.impedanceCheck) ?? null,
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
    normalRanges: {
      upperLimitProtein: toNumber(at(RESULT_INDEX_MAP.upperLimitProtein)),
      lowerLimitProtein: toNumber(at(RESULT_INDEX_MAP.lowerLimitProtein)),
      upperLimitMinerals: toNumber(at(RESULT_INDEX_MAP.upperLimitMinerals)),
      lowerLimitMinerals: toNumber(at(RESULT_INDEX_MAP.lowerLimitMinerals)),
      upperLimitWeight: toNumber(at(RESULT_INDEX_MAP.upperLimitWeight)),
      lowerLimitWeight: toNumber(at(RESULT_INDEX_MAP.lowerLimitWeight)),
      upperLimitSmm: toNumber(at(RESULT_INDEX_MAP.upperLimitSmm)),
      lowerLimitSmm: toNumber(at(RESULT_INDEX_MAP.lowerLimitSmm)),
      upperLimitBmi: toNumber(at(RESULT_INDEX_MAP.upperLimitBmi)),
      lowerLimitBmi: toNumber(at(RESULT_INDEX_MAP.lowerLimitBmi)),
      upperLimitPbf: toNumber(at(RESULT_INDEX_MAP.upperLimitPbf)),
      lowerLimitPbf: toNumber(at(RESULT_INDEX_MAP.lowerLimitPbf)),
      upperLimitWhr: toNumber(at(RESULT_INDEX_MAP.upperLimitWhr)),
      lowerLimitWhr: toNumber(at(RESULT_INDEX_MAP.lowerLimitWhr)),
      lowerLimitBfm: toNumber(at(RESULT_INDEX_MAP.lowerLimitBfm)),
      upperLimitBfm: toNumber(at(RESULT_INDEX_MAP.upperLimitBfm)),
      lowerLimitBmr: toNumber(at(RESULT_INDEX_MAP.lowerLimitBmr)),
      upperLimitBmr: toNumber(at(RESULT_INDEX_MAP.upperLimitBmr)),
      lowerLimitTbw: toNumber(at(RESULT_INDEX_MAP.lowerLimitTbw)),
      upperLimitTbw: toNumber(at(RESULT_INDEX_MAP.upperLimitTbw)),
      lowerLimitFfm: toNumber(at(RESULT_INDEX_MAP.lowerLimitFfm)),
      upperLimitFfm: toNumber(at(RESULT_INDEX_MAP.upperLimitFfm)),
    },
    evaluations: {
      evaluationProtein: toNumber(at(RESULT_INDEX_MAP.evaluationProtein)),
      evaluationMinerals: toNumber(at(RESULT_INDEX_MAP.evaluationMinerals)),
      evaluationBodyFat: toNumber(at(RESULT_INDEX_MAP.evaluationBodyFat)),
      obesityEvaluationBmi: toNumber(at(RESULT_INDEX_MAP.obesityEvaluationBmi)),
      obesityEvaluationPbf: toNumber(at(RESULT_INDEX_MAP.obesityEvaluationPbf)),
      bodyBalanceUpper: toNumber(at(RESULT_INDEX_MAP.bodyBalanceUpper)),
      bodyBalanceLower: toNumber(at(RESULT_INDEX_MAP.bodyBalanceLower)),
      bodyBalanceUpperLower: toNumber(at(RESULT_INDEX_MAP.bodyBalanceUpperLower)),
    },
    segmentalEvals: {
      leanMassEvaluationLeftArm: toNumber(at(RESULT_INDEX_MAP.leanMassEvaluationLeftArm)),
      leanMassEvaluationRightArm: toNumber(at(RESULT_INDEX_MAP.leanMassEvaluationRightArm)),
      leanMassEvaluationTrunk: toNumber(at(RESULT_INDEX_MAP.leanMassEvaluationTrunk)),
      leanMassEvaluationLeftLeg: toNumber(at(RESULT_INDEX_MAP.leanMassEvaluationLeftLeg)),
      leanMassEvaluationRightLeg: toNumber(at(RESULT_INDEX_MAP.leanMassEvaluationRightLeg)),
      bodyFatMassEvaluationLeftArm: toNumber(at(RESULT_INDEX_MAP.bodyFatMassEvaluationLeftArm)),
      bodyFatMassEvaluationRightArm: toNumber(at(RESULT_INDEX_MAP.bodyFatMassEvaluationRightArm)),
      bodyFatMassEvaluationTrunk: toNumber(at(RESULT_INDEX_MAP.bodyFatMassEvaluationTrunk)),
      bodyFatMassEvaluationLeftLeg: toNumber(at(RESULT_INDEX_MAP.bodyFatMassEvaluationLeftLeg)),
      bodyFatMassEvaluationRightLeg: toNumber(at(RESULT_INDEX_MAP.bodyFatMassEvaluationRightLeg)),
    },
    raw: fields,
  }
}
