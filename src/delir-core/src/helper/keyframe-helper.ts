import Asset from '../project/asset'
import Keyframe from '../project/keyframe'
import ColorRGB from '../values/color-rgb'
import ColorRGBA from '../values/color-rgba'

import {
    TypeDescriptor,
    ParameterValueTypes,
    AnyParameterTypeDescriptor,
} from '../plugin-support/type-descriptor'

import * as bezierEasing from 'bezier-easing'

interface KeyFrameLink {
    previous: Keyframe|null
    active: Keyframe
    next: Keyframe|null
}

export interface KeyframeValueSequence {
    [frame: number]: ParameterValueTypes
}

export function calcKeyframeValuesAt(
    frame: number,
    clipPlacedFrame: number,
    descriptor: TypeDescriptor,
    keyframes: {[propName: string]: Keyframe[]},
): {[propName: string]: ParameterValueTypes}
{
    return descriptor.properties.map<[string, ParameterValueTypes]>(desc => {
        return [
            desc.propName,
            calcKeyframeValueAt(frame, clipPlacedFrame, desc, keyframes[desc.propName] || [])
        ]
    })
    .reduce((values, entry) => {
        values[entry[0]] = entry[1]
        return values
    }, Object.create(null))
}

export function calcKeyframeValueAt(
    frame: number,
    clipPlacedFrame: number,
    desc: AnyParameterTypeDescriptor,
    keyframes: Keyframe[],
): ParameterValueTypes
{
    switch (desc.type) {
        case 'POINT_2D':
            return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcPoint2dKeyFrames)[frame]
        case 'POINT_3D':
            return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcPoint3dKeyFrames)[frame]
        case 'SIZE_2D':
            return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcSize2dKeyFrames)[frame]
        case 'SIZE_3D':
            return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcSize3dKeyFrames)[frame]
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
        case 'CODE':
            return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcCodeKeyFrames)[frame]
        case 'ENUM':
            return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcEnumKeyFrames)[frame]
        // case 'CLIP':
        //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcNoAnimatable)[frame]
        // case 'PULSE':
        //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcPulseKeyFrames)[frame]
        // case 'ARRAY':
        //     return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcArrayOfKeyFrames)[frame]
        case 'ASSET':
            return calcKeyframe(desc, keyframes, clipPlacedFrame, frame, 1, calcAssetKeyFrames)[frame]
        default:
            throw new Error(`Unsupported parameter type ${desc.type}`)
    }
}

export function calcKeyFrames(
    paramTypes: TypeDescriptor|AnyParameterTypeDescriptor[],
    keyFrames: {[propName: string]: Keyframe[]},
    clipPlacedFrame: number,
    beginFrame: number,
    calcFrames: number
): {[propName: string]: KeyframeValueSequence}
{
    const tables: {[propName: string]: KeyframeValueSequence} = {}
    const props = paramTypes instanceof TypeDescriptor ? paramTypes.properties : paramTypes

    for (const propDesc of props) {
        const {propName} = propDesc
        const propSequence = keyFrames[propName] || []

        switch (propDesc.type) {
            case 'POINT_2D':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcPoint2dKeyFrames)
            break;
            case 'POINT_3D':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcPoint3dKeyFrames)
            break;
            case 'SIZE_2D':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcSize2dKeyFrames)
            break;
            case 'SIZE_3D':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcSize3dKeyFrames)
            break;
            case 'COLOR_RGB':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcColorRgbKeyFrames)
            break;
            case 'COLOR_RGBA':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcColorRgbaKeyFrames)
            break;
            case 'BOOL':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcBoolKeyFrames)
            break;
            case 'STRING':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcStringKeyFrames)
            break;
            case 'NUMBER':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcNumberKeyFrames)
            break;
            case 'FLOAT':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcFloatKeyFrames)
            break;
            case 'CODE':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcCodeKeyFrames)
            break
            case 'ENUM':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcEnumKeyFrames)
            break;
            // case 'CLIP':
            //     tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcNoAnimatable)
            // break;
            // case 'PULSE':
            //     tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcPulseKeyFrames)
            // break;
            // case 'ARRAY':
            //     tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcArrayOfKeyFrames)
            // break;
            case 'ASSET':
                tables[propName] = calcKeyframe(propDesc, propSequence, clipPlacedFrame, beginFrame, calcFrames, calcAssetKeyFrames)
            break;
        }
    }

    return tables
}

export function calcKeyframe(
    propDesc: AnyParameterTypeDescriptor,
    keyFrameSequense: Keyframe[],
    clipPlacedFrame: number,
    beginFrame: number,
    calcFrames: number,
    transformer: (rate: number, frame: number, keyFrameLink: KeyFrameLink) => any
): KeyframeValueSequence
{
    const orderedSequense: Keyframe[] = keyFrameSequense
        .slice(0)
        .sort((kfA, kfB) => kfA.frameOnClip - kfB.frameOnClip)

    const linkedSequense: KeyFrameLink[] = _buildLinkedKeyFrame(orderedSequense)

    const table: KeyframeValueSequence = {}

    for (let frame = beginFrame, end = beginFrame + calcFrames; frame <= end; frame++) {
        const activeKeyFrame: KeyFrameLink|null = _activeKeyFrameOfFrame(linkedSequense, clipPlacedFrame, frame)

        if (activeKeyFrame == null) {
            // 0  10  20
            // |   |   |
            // -> if keyframes empty use defaultValue
            table[frame] = (propDesc as {defaultValue: ParameterValueTypes}).defaultValue
            continue
        }

        if (activeKeyFrame.previous == null && frame < (clipPlacedFrame + activeKeyFrame.active.frameOnClip)) {
            // [0]  10  20
            //       ◇   ◇
            // -> use 10frame's value at frame 0
            table[frame] = activeKeyFrame.active.value
            continue
        }

        if (activeKeyFrame.next == null && frame >= (clipPlacedFrame + activeKeyFrame.active.frameOnClip)) {
            //  0  [10]
            //  ◇   |
            // -> use 0frame's value at frame 10
            table[frame] = activeKeyFrame.active.value
            continue
        }

        const currentKeyEaseOut = activeKeyFrame.active.easeOutParam ? activeKeyFrame.active.easeOutParam : [0, 0]
        const nextKeyEaseIn = activeKeyFrame.next ?
            activeKeyFrame.next.easeInParam || [1, 1]
            : [1, 2]

        // TODO: Cache Bezier instance between change active keyframe
        const bezier = bezierEasing(...currentKeyEaseOut, ...nextKeyEaseIn)

        const progressRate = activeKeyFrame.next
            ? (frame - (clipPlacedFrame + activeKeyFrame.active.frameOnClip)) / ((clipPlacedFrame + activeKeyFrame.next.frameOnClip) - (clipPlacedFrame + activeKeyFrame.active.frameOnClip))
            : 1

        if (!activeKeyFrame.next || !activeKeyFrame.active) {
            debugger
        }

        table[frame] = transformer(bezier(progressRate), frame, activeKeyFrame)

        if (propDesc.animatable === false) {
            break
        }
    }

    return table
}

function _buildLinkedKeyFrame(orderedKeyFrameSeq: Keyframe[]): KeyFrameLink[]
{
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

function _activeKeyFrameOfFrame(linkedKeyFrameSeq: KeyFrameLink[], clipPlacedFrame: number, frame: number): KeyFrameLink|null
{
    if (linkedKeyFrameSeq.length === 1) {
        return linkedKeyFrameSeq[0]
    }

    for (const keyFrameLink of linkedKeyFrameSeq) {
        if (
            keyFrameLink.next == null ||
            ((clipPlacedFrame + keyFrameLink.active.frameOnClip) <= frame && frame < (clipPlacedFrame + keyFrameLink.next.frameOnClip)) ||
            (keyFrameLink.previous == null && frame < (clipPlacedFrame + keyFrameLink.active.frameOnClip))
        ) {
            return keyFrameLink
        }
    }

    return null
}

//
// Typed keyframe calculators
//

function calcPoint2dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): {x: number, y:number}
{
    const xVector = keyFrameLink.next!.value.x - keyFrameLink.active.value.x
    const yVector = keyFrameLink.next!.value.y - keyFrameLink.active.value.y

    return {
        x: keyFrameLink.active.value.x + (xVector * rate),
        y: keyFrameLink.active.value.y + (yVector * rate),
    }
}

function calcPoint3dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): {x: number, y: number, z: number}
{
    const xVector = keyFrameLink.next!.value.x - keyFrameLink.active.value.x
    const yVector = keyFrameLink.next!.value.y - keyFrameLink.active.value.y
    const zVector = keyFrameLink.next!.value.z - keyFrameLink.active.value.z

    return {
        x: keyFrameLink.active.value.x + (xVector * rate),
        y: keyFrameLink.active.value.y + (yVector * rate),
        z: keyFrameLink.active.value.z + (zVector * rate),
    }
}

function calcSize2dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): {width: number, height: number}
{
    const widthVector = keyFrameLink.next!.value.width - keyFrameLink.active.value.width
    const heightVector = keyFrameLink.next!.value.height - keyFrameLink.active.value.height

    return {
        width: keyFrameLink.active.value.width + (widthVector * rate),
        height: keyFrameLink.active.value.height + (heightVector * rate),
    }
}

function calcSize3dKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): {width: number, height: number, depth: number}
{
    const widthVector = keyFrameLink.next!.value.width - keyFrameLink.active.value.width
    const heightVector = keyFrameLink.next!.value.height - keyFrameLink.active.value.height
    const depthVector = keyFrameLink.next!.value.depth - keyFrameLink.active.value.depth

    return {
        width: keyFrameLink.active.value.width + (widthVector * rate),
        height: keyFrameLink.active.value.height + (heightVector * rate),
        depth: keyFrameLink.active.value.depth + (depthVector * rate),
    }
}

function calcColorRgbKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): {red: number, green: number, blue: number}
{
    const redVector = keyFrameLink.next!.value.red - keyFrameLink.active.value.red
    const greenVector = keyFrameLink.next!.value.green - keyFrameLink.active.value.green
    const blueVector = keyFrameLink.next!.value.blue - keyFrameLink.active.value.blue

    return new ColorRGB(
        keyFrameLink.active.value.red + (redVector * rate),
        keyFrameLink.active.value.green + (greenVector * rate),
        keyFrameLink.active.value.blue + (blueVector * rate),
    )
}

function calcColorRgbaKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): {red:number, green: number, blue: number, alpha: number}
{
    const redVector = keyFrameLink.next!.value.red - keyFrameLink.active.value.red
    const greenVector = keyFrameLink.next!.value.green - keyFrameLink.active.value.green
    const blueVector = keyFrameLink.next!.value.blue - keyFrameLink.active.value.blue
    const alphaVector = keyFrameLink.next!.value.alpha - keyFrameLink.active.value.alpha

    return new ColorRGBA(
        keyFrameLink.active.value.red + (redVector * rate),
        keyFrameLink.active.value.green + (greenVector * rate),
        keyFrameLink.active.value.blue + (blueVector * rate),
        keyFrameLink.active.value.alpha + (alphaVector * rate),
    )
}

function calcBoolKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): boolean
{
    return keyFrameLink.previous ? !!keyFrameLink.previous.value : !!keyFrameLink.active.value
}

function calcStringKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): string
{
    return keyFrameLink.active.value
}

function calcNumberKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): number
{
    const numVector = keyFrameLink.next.value - keyFrameLink.active.value
    return Math.round(keyFrameLink.active.value + (numVector * rate))
}

function calcFloatKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): number
{
    const floatVector = keyFrameLink.next!.value - keyFrameLink.active.value
    return keyFrameLink.active.value + (floatVector * rate)
}

function calcPulseKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): boolean
{
    return keyFrameLink.active.frameOnClip === frame ? true : false
}

function calcCodeKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): any
{
    return keyFrameLink.previous ? keyFrameLink.previous.value : keyFrameLink.active.value
}

function calcEnumKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): any
{
    return keyFrameLink.previous ? keyFrameLink.previous.value : keyFrameLink.active.value
}

function calcClipKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): any // TODO: Typing
{
    return keyFrameLink.previous ? keyFrameLink.previous.value : keyFrameLink.active.value
}

function calcAssetKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): Asset
{
    return keyFrameLink.previous ? keyFrameLink.previous.value : keyFrameLink.active.value
}

function calcNoAnimatable(rate: number, frame: number, keyFrameLink: KeyFrameLink): any
{
    return keyFrameLink.active.value
}

function calcArrayOfKeyFrames(rate: number, frame: number, keyFrameLink: KeyFrameLink): any // TODO: Typing
{
}
