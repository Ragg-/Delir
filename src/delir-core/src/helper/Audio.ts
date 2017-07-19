import * as _ from 'lodash'

export const resampling = async (sourceSamplingRate: number, destSamplingRate: number, inputs: Float32Array[]|AudioBuffer, length?: number): Promise<Float32Array[]> => {
    const chs = Array.isArray(inputs) ? inputs.length : inputs.numberOfChannels
    length = length == null ? (Array.isArray(inputs) ? inputs[0].length : inputs.length) : length

    const context = new OfflineAudioContext(chs, length, destSamplingRate)
    const inputBuffer = context.createBuffer(chs, length, sourceSamplingRate)
    _.times(chs, ch => { inputBuffer.copyToChannel(inputs[ch], ch) })

    const bufferSource = context.createBufferSource()
    bufferSource.buffer = inputBuffer
    bufferSource.connect(context.destination)
    bufferSource.start(0)

    const result = await context.startRendering()
    return _.times(chs, ch => result.getChannelData(ch))
}

/**
 * Merge `incoming` audio buffer(Float32Array) into `dest` array.
 */
export const mergeInto = async (
    dest: Float32Array[],
    incoming: Float32Array[],
    numberOfChannels: number,
    sampleRate: number
): Promise<void> => {
    if (incoming.length !== dest.length) {
        throw new Error(`Unmatched number of channels (destination ${dest.length}, incoming ${incoming.length}`)
    }

    const length = dest[0].length
    const context = new OfflineAudioContext(numberOfChannels, length, sampleRate)

    // Create buffers
    const destBuffer = context.createBuffer(numberOfChannels, length, sampleRate)
    dest.forEach((buffer, ch) => destBuffer.copyToChannel(buffer, ch))

    const incomingBuffer = context.createBuffer(numberOfChannels, length, sampleRate)
    incoming.forEach((buffer, ch) => incomingBuffer.copyToChannel(buffer, ch))

    // Assign to BufferSource
    const destSource = context.createBufferSource()
    destSource.buffer = destBuffer

    const incomingSource = context.createBufferSource()
    incomingSource.buffer = incomingBuffer

    // Rendering
    destSource.connect(context.destination)
    incomingSource.connect(context.destination)

    destSource.start(0)
    incomingSource.start(0)

    const result = await context.startRendering()

    // Export
    _.times(numberOfChannels, ch => {
        dest[ch].set(result.getChannelData(ch))
    })
}

export const arraysToAudioBuffer = (source: Float32Array[], sampleRate: number) => {
    const audioBuffer = new (AudioBuffer as any)({
        sampleRate,
        numberOfChannels: source.length,
        length: source[0].length,
    }) as AudioBuffer

    source.forEach((buffer, ch) => audioBuffer.copyToChannel(buffer, ch))

    return audioBuffer
}
