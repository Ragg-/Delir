import {ParameterValueTypes} from '../../plugin-support/type-descriptor'
import Composition from '../../project/composition'
import EntityResolver from './entity-resolver'
import PreRenderingRequest from './pre-rendering-request'

import * as _ from 'lodash'

export default class RenderRequest<T = {[propName: string]: ParameterValueTypes}>
{
    private static _permitKeys = [
        'time',
        'timeOnComposition',
        'timeOnClip',

        'frame',
        'frameOnComposition',
        'frameOnClip',

        'destCanvas',
        'width',
        'height',
        'framerate',
        'durationFrames',

        'destAudioBuffer',
        'audioContext',
        'samplingRate',
        'neededSamples',
        'audioChannels',
        'isAudioBufferingNeeded',

        // 'rootComposition', // not permitted
        'parentComposition',

        // 'compositionScope',
        // 'clipScope',

        'parameters',
    ]

    private static _permitOnlyInitializeKey = [
        'rootComposition',
        'resolver',
    ]

    //
    // Current frame times
    //
    public readonly time: number
    public readonly timeOnComposition: number
    public readonly timeOnClip: number

    public readonly frame: number
    public readonly frameOnComposition: number
    public readonly frameOnClip: number

    //
    // Composition options
    //
    public readonly destCanvas: HTMLCanvasElement
    public readonly width: number
    public readonly height: number
    public readonly framerate: number
    public readonly durationFrames: number

    public readonly destAudioBuffer: Float32Array[]
    public readonly audioContext: AudioContext|OfflineAudioContext
    public readonly samplingRate: number
    public readonly neededSamples: number
    public readonly audioChannels: number
    public readonly isAudioBufferingNeeded: boolean

    //
    // Composition hierarchy
    //
    public readonly rootComposition: Readonly<Composition>
    public readonly parentComposition: Readonly<Composition>

    //
    // Variable store
    //
    // public readonly compositionScope: {[prop: string]: any}
    // public readonly clipScope: {[prop: string]: any}

    public readonly parameters: T

    //
    // Resolver
    //
    public readonly resolver: EntityResolver

    // alias
    public get seconds(): number { return this.time }

    constructor(properties: Optionalized<RenderRequest<T>> = {})
    {
        const props = _.pick(
            properties,
            RenderRequest._permitKeys.concat(RenderRequest._permitOnlyInitializeKey)
        )

        Object.assign(this, props)
        Object.freeze(this)
    }

    public clone(patch: Partial<RenderRequest<T>>): RenderRequest<T>
    {
        const permitPatch = _.pick(patch, RenderRequest._permitKeys)
        return new RenderRequest<T>(Object.assign({}, this, permitPatch))
    }

    public toPreRenderingRequest(): PreRenderingRequest<T>
    {
        return new PreRenderingRequest<T>({
            width: this.width,
            height: this.height,
            framerate: this.framerate,
            durationFrames: this.durationFrames,

            samplingRate: this.samplingRate,
            audioBufferSize: this.neededSamples,
            audioChannels: this.audioChannels,

            rootComposition: this.rootComposition,
            parentComposition: this.parentComposition,

            parameters: this.parameters,

            resolver: this.resolver,
        })
    }
}
