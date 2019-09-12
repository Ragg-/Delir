import bezierEasing from 'bezier-easing'
import * as flubber from 'flubber'

import { Keyframe, KeyframeValueTypes } from '../Entity'
import ColorRGB from '../Values/ColorRGB'
import ColorRGBA from '../Values/ColorRGBA'

import { AnyParameterTypeDescriptor, TypeDescriptor } from '../PluginSupport/TypeDescriptor'
import { AssetPointer } from '../Values'
import { ShapeProxy } from './RuntimeValue/ShapeProxy'

interface KeyframeLink<T extends KeyframeValueTypes> {
  previous: Keyframe<T> | null
  active: Keyframe<T>
  next: Keyframe<T> | null
}

export interface KeyframeParamValueSequence {
  [frame: number]: KeyframeValueTypes
}

export function calcKeyframesAt(
  frame: number,
  clipPlacedFrame: number,
  descriptor: TypeDescriptor,
  keyframes: { [paramName: string]: ReadonlyArray<Keyframe> },
): { [paramName: string]: KeyframeValueTypes } {
  return descriptor.properties
    .map<[string, KeyframeValueTypes]>(desc => {
      return [desc.paramName, calcKeyframeAt(frame, clipPlacedFrame, desc, keyframes[desc.paramName] || [])]
    })
    .reduce((values, entry) => {
      values[entry[0]] = entry[1]
      return values
    }, Object.create(null))
}

export function calcKeyframeAt(
  frame: number,
  clipPlacedFrame: number,
  desc: AnyParameterTypeDescriptor,
  keyframes: ReadonlyArray<Keyframe>,
): KeyframeValueTypes {
  switch (desc.type) {
    // case 'POINT_2D':
    //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcPoint2dKeyFrames)[frame]
    // case 'POINT_3D':
    //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcPoint3dKeyFrames)[frame]
    // case 'SIZE_2D':
    //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcSize2dKeyFrames)[frame]
    // case 'SIZE_3D':
    //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcSize3dKeyFrames)[frame]
    case 'COLOR_RGB':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcColorRgbKeyFrames)[frame]
    case 'COLOR_RGBA':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcColorRgbaKeyFrames)[frame]
    case 'BOOL':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcBoolKeyFrames)[frame]
    case 'STRING':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcStringKeyFrames)[frame]
    case 'NUMBER':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcNumberKeyFrames)[frame]
    case 'FLOAT':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcFloatKeyFrames)[frame]
    case 'ENUM':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcEnumKeyFrames)[frame]
    case 'CODE':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcNonAnimatableKeyframes)[frame]
    // case 'CLIP':
    //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcNoAnimatable)[frame]
    // case 'PULSE':
    //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcPulseKeyFrames)[frame]
    // case 'ARRAY':
    //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcArrayOfKeyFrames)[frame]
    case 'ASSET':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcAssetKeyFrames)[frame]
    case 'SHAPE':
      return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcShapeKeyframes)[frame]
    default:
      throw new Error('Unsupported parameter type')
  }
}

export function calcKeyframesInRange(
  paramTypes: TypeDescriptor | AnyParameterTypeDescriptor[],
  keyFrames: { [paramName: string]: ReadonlyArray<Keyframe> },
  clipPlacedFrame: number,
  beginFrame: number,
  calcFrames: number,
): { [paramName: string]: KeyframeParamValueSequence } {
  const tables: { [paramName: string]: KeyframeParamValueSequence } = {}
  const params = paramTypes instanceof TypeDescriptor ? paramTypes.properties : paramTypes

  for (const paramDesc of params) {
    const { paramName } = paramDesc
    const propSequence = keyFrames[paramName] || []

    switch (paramDesc.type) {
      // case 'POINT_2D':
      //     tables[paramName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcPoint2dKeyFrames)
      // break
      // case 'POINT_3D':
      //     tables[paramName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcPoint3dKeyFrames)
      // break
      // case 'SIZE_2D':
      //     tables[paramName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcSize2dKeyFrames)
      // break
      // case 'SIZE_3D':
      //     tables[paramName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcSize3dKeyFrames)
      // break
      case 'COLOR_RGB':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcColorRgbKeyFrames,
        )
        break
      case 'COLOR_RGBA':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcColorRgbaKeyFrames,
        )
        break
      case 'BOOL':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcBoolKeyFrames,
        )
        break
      case 'STRING':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcStringKeyFrames,
        )
        break
      case 'NUMBER':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcNumberKeyFrames,
        )
        break
      case 'FLOAT':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcFloatKeyFrames,
        )
        break
      case 'ENUM':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcEnumKeyFrames,
        )
        break
      // case 'CLIP':
      //     tables[paramName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcNoAnimatable)
      // break
      // case 'PULSE':
      //     tables[paramName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcPulseKeyFrames)
      // break
      // case 'ARRAY':
      //     tables[paramName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcArrayOfKeyFrames)
      // break
      case 'ASSET':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcAssetKeyFrames,
        )
        break
      case 'CODE':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcNonAnimatableKeyframes,
        )
        break
      case 'SHAPE':
        tables[paramName] = calcKeyframe(
          paramDesc,
          propSequence,
          clipPlacedFrame,
          beginFrame,
          calcFrames,
          calcShapeKeyframes,
        )
    }
  }

  return tables
}

function calcKeyframe(
  propDesc: AnyParameterTypeDescriptor,
  keyFrameSequense: ReadonlyArray<Keyframe>,
  clipPlacedFrame: number,
  beginFrame: number,
  calcFrames: number,
  transformer: (rate: number, frame: number, keyFrameLink: KeyframeLink<KeyframeValueTypes>) => any,
): KeyframeParamValueSequence {
  const orderedSequense: Keyframe[] = keyFrameSequense.slice(0).sort((kfA, kfB) => kfA.frameOnClip - kfB.frameOnClip)

  const linkedSequense: KeyframeLink<KeyframeValueTypes>[] = buildLinkedKeyFrame(orderedSequense)

  const table: KeyframeParamValueSequence = {}

  for (let frame = beginFrame, end = beginFrame + calcFrames; frame <= end; frame++) {
    const activeKeyFrame: KeyframeLink<KeyframeValueTypes> | null = activeKeyFrameOfFrame(
      linkedSequense,
      clipPlacedFrame,
      frame,
    )

    if (activeKeyFrame == null) {
      // 0  10  20
      // |   |   |
      // -> if keyframes empty use defaultValue
      table[frame] = (propDesc as {
        defaultValue: KeyframeValueTypes
      }).defaultValue
      continue
    }

    if (activeKeyFrame.previous == null && frame < clipPlacedFrame + activeKeyFrame.active.frameOnClip) {
      // [0]  10  20
      //       ◇   ◇
      // -> use 10frame's value at frame 0
      table[frame] = activeKeyFrame.active.value
      continue
    }

    if (activeKeyFrame.next == null && frame >= clipPlacedFrame + activeKeyFrame.active.frameOnClip) {
      //  0  [10]
      //  ◇   |
      // -> use 0frame's value at frame 10
      table[frame] = activeKeyFrame.active.value
      continue
    }

    const currentKeyEaseOut = activeKeyFrame.active.easeOutParam ? activeKeyFrame.active.easeOutParam : [0, 0]
    const nextKeyEaseIn = activeKeyFrame.next ? activeKeyFrame.next.easeInParam || [1, 1] : [1, 2]

    // TODO: Cache Bezier instance between change active keyframe
    const bezier = bezierEasing(...currentKeyEaseOut, ...nextKeyEaseIn)

    const progressRate = activeKeyFrame.next
      ? (frame - (clipPlacedFrame + activeKeyFrame.active.frameOnClip)) /
        (clipPlacedFrame + activeKeyFrame.next.frameOnClip - (clipPlacedFrame + activeKeyFrame.active.frameOnClip))
      : 1

    table[frame] = transformer(bezier(progressRate), frame, activeKeyFrame)

    if (propDesc.animatable === false) {
      break
    }
  }

  return table
}

function buildLinkedKeyFrame(orderedKeyFrameSeq: Keyframe[]): KeyframeLink<KeyframeValueTypes>[] {
  const linked = []
  const placedFrames = (Object.keys(orderedKeyFrameSeq) as any[]) as number[]

  for (let idx = 0, l = placedFrames.length; idx < l; idx++) {
    linked.push({
      previous: orderedKeyFrameSeq[placedFrames[idx - 1]],
      active: orderedKeyFrameSeq[placedFrames[idx]],
      next: orderedKeyFrameSeq[placedFrames[idx + 1]],
    })
  }

  return linked
}

function activeKeyFrameOfFrame(
  linkedKeyFrameSeq: KeyframeLink<KeyframeValueTypes>[],
  clipPlacedFrame: number,
  frame: number,
): KeyframeLink<KeyframeValueTypes> | null {
  if (linkedKeyFrameSeq.length === 1) {
    return linkedKeyFrameSeq[0]
  }

  for (const keyFrameLink of linkedKeyFrameSeq) {
    if (
      keyFrameLink.next == null ||
      (clipPlacedFrame + keyFrameLink.active.frameOnClip <= frame &&
        frame < clipPlacedFrame + keyFrameLink.next.frameOnClip) ||
      (keyFrameLink.previous == null && frame < clipPlacedFrame + keyFrameLink.active.frameOnClip)
    ) {
      return keyFrameLink
    }
  }

  return null
}

//
// Typed keyframe calculators
//

// function calcPoint2dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink<Point2D>): {x: number, y: number}
// {
//     const xVector = keyFrameLink.next!.value!.x - keyFrameLink.active.value!.x
//     const yVector = keyFrameLink.next!.value!.y - keyFrameLink.active.value!.y

//     return {
//         x: keyFrameLink.active.value!.x + (xVector * rate),
//         y: keyFrameLink.active.value!.y + (yVector * rate),
//     }
// }

// function calcPoint3dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink<Point3D>): {x: number, y: number, z: number}
// {
//     const xVector = keyFrameLink.next!.value!.x - keyFrameLink.active.value!.x
//     const yVector = keyFrameLink.next!.value!.y - keyFrameLink.active.value!.y
//     const zVector = keyFrameLink.next!.value!.z - keyFrameLink.active.value!.z

//     return {
//         x: keyFrameLink.active.value!.x + (xVector * rate),
//         y: keyFrameLink.active.value!.y + (yVector * rate),
//         z: keyFrameLink.active.value!.z + (zVector * rate),
//     }
// }

// function calcSize2dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink<Size2D>): {width: number, height: number}
// {
//     const widthVector = keyFrameLink.next!.value!.width - keyFrameLink.active.value!.width
//     const heightVector = keyFrameLink.next!.value!.height - keyFrameLink.active.value!.height

//     return {
//         width: keyFrameLink.active.value!.width + (widthVector * rate),
//         height: keyFrameLink.active.value!.height + (heightVector * rate),
//     }
// }

// function calcSize3dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink<Size3D>): {width: number, height: number, depth: number}
// {
//     const widthVector = keyFrameLink.next!.value!.width - keyFrameLink.active.value!.width
//     const heightVector = keyFrameLink.next!.value!.height - keyFrameLink.active.value!.height
//     const depthVector = keyFrameLink.next!.value!.depth - keyFrameLink.active.value!.depth

//     return {
//         width: keyFrameLink.active.value!.width + (widthVector * rate),
//         height: keyFrameLink.active.value!.height + (heightVector * rate),
//         depth: keyFrameLink.active.value!.depth + (depthVector * rate),
//     }
// }

function calcColorRgbKeyFrames(
  rate: number,
  frame: number,
  keyFrameLink: KeyframeLink<ColorRGB>,
): { red: number; green: number; blue: number } {
  const redVector = keyFrameLink.next!.value!.red - keyFrameLink.active.value!.red
  const greenVector = keyFrameLink.next!.value!.green - keyFrameLink.active.value!.green
  const blueVector = keyFrameLink.next!.value!.blue - keyFrameLink.active.value!.blue

  return new ColorRGB(
    keyFrameLink.active.value!.red + redVector * rate,
    keyFrameLink.active.value!.green + greenVector * rate,
    keyFrameLink.active.value!.blue + blueVector * rate,
  )
}

function calcColorRgbaKeyFrames(
  rate: number,
  frame: number,
  keyFrameLink: KeyframeLink<ColorRGBA>,
): { red: number; green: number; blue: number; alpha: number } {
  const redVector = keyFrameLink.next!.value!.red - keyFrameLink.active.value!.red
  const greenVector = keyFrameLink.next!.value!.green - keyFrameLink.active.value!.green
  const blueVector = keyFrameLink.next!.value!.blue - keyFrameLink.active.value!.blue
  const alphaVector = keyFrameLink.next!.value!.alpha - keyFrameLink.active.value!.alpha

  return new ColorRGBA(
    keyFrameLink.active.value!.red + redVector * rate,
    keyFrameLink.active.value!.green + greenVector * rate,
    keyFrameLink.active.value!.blue + blueVector * rate,
    keyFrameLink.active.value!.alpha + alphaVector * rate,
  )
}

function calcBoolKeyFrames(rate: number, frame: number, keyFrameLink: KeyframeLink<boolean>): boolean {
  return keyFrameLink.previous ? !!keyFrameLink.previous.value : !!keyFrameLink.active.value
}

function calcStringKeyFrames(rate: number, frame: number, keyFrameLink: KeyframeLink<string>): string {
  return keyFrameLink.active!.value as string
}

function calcNumberKeyFrames(rate: number, frame: number, keyFrameLink: KeyframeLink<number>): number {
  const numVector = (keyFrameLink.next!.value as number) - (keyFrameLink.active!.value as number)
  return Math.round((keyFrameLink.active!.value as number) + numVector * rate)
}

function calcFloatKeyFrames(rate: number, frame: number, keyFrameLink: KeyframeLink<number>): number {
  const floatVector = (keyFrameLink.next!.value as number) - (keyFrameLink.active!.value! as number)
  return (keyFrameLink.active.value as number) + floatVector * rate
}

function calcPulseKeyFrames(rate: number, frame: number, keyFrameLink: KeyframeLink<any>): boolean {
  return keyFrameLink.active.frameOnClip === frame ? true : false
}

function calcEnumKeyFrames(rate: number, frame: number, keyFrameLink: KeyframeLink<string>): any {
  return keyFrameLink.previous ? keyFrameLink.previous.value : keyFrameLink.active.value
}

// function calcClipKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): any // TODO: Typing
// {
//     return keyFrameLink.previous ? keyFrameLink.previous.value : keyFrameLink.active.value
// }

function calcAssetKeyFrames(rate: number, frame: number, keyFrameLink: KeyframeLink<AssetPointer>): AssetPointer {
  return keyFrameLink.previous
    ? (keyFrameLink.previous.value! as AssetPointer)
    : (keyFrameLink.active!.value as AssetPointer)
}

function calcShapeKeyframes(rate: number, frame: number, keyframeLink: KeyframeLink<string>): string {
  return keyframeLink.previous
    ? flubber.interpolate(
        keyframeLink.previous.value,
        (keyframeLink.next ? keyframeLink.next.value : keyframeLink.previous.value) || keyframeLink.previous.value,
      )(rate)
    : flubber.interpolate(
        keyframeLink.active!.value,
        keyframeLink.next ? keyframeLink.next.value : keyframeLink.active.value,
      )(rate)
}

function calcNonAnimatableKeyframes(rate: number, frame: number, keyFrameLink: KeyframeLink<any>): any {
  return keyFrameLink.active.value
}

// function calcArrayOfKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): any // TODO: Typing
// {
// }
