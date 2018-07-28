import * as classnames from 'classnames'
import * as Delir from '@ragg/delir-core'
import * as _ from 'lodash'
import * as mouseWheel from 'mouse-wheel'
import * as React from 'react'
import connectToStores from '../../utils/Flux/connectToStores'
import { MeasurePoint } from '../../utils/TimePixelConversion'

import { ContextMenu, MenuItem, MenuItemProps } from '../components/ContextMenu'
import Pane from '../components/pane'
import SelectList from '../components/select-list'
import Workspace from '../components/workspace'
import DelirValueInput from './_DelirValueInput'
import ExpressionEditor from './ExpressionEditor'
import { default as KeyframeGraph, KeyframePatch } from './KeyframeGraph'

import AppActions from '../../actions/App'
import ProjectModActions from '../../actions/ProjectMod'

import RendererService from '../../services/renderer'
import {default as EditorStateStore, EditorState } from '../../stores/EditorStateStore'
import {default as ProjectStore, ProjectStoreState } from '../../stores/ProjectStore'

import t from './KeyframeEditor.i18n'
import * as s from './KeyframeEditor.sass'

interface KeyframeEditorProps {
    activeComposition: Delir.Project.Composition | null
    activeClip: Delir.Project.Clip | null
    editor: EditorState
    project: ProjectStoreState
    scrollLeft: number
    scale: number
    pxPerSec: number
    measures: MeasurePoint[]
    onScroll: (dx: number, dy: number) => void
    onScaled: (scale: number) => void
}

interface KeyframeEditorState {
    activePropName: string | null
    activeEntity: { type: 'clip' | 'effect', entityId: string } | null
    graphWidth: number
    graphHeight: number
    keyframeViewViewBox: string | undefined
    editorOpened: boolean
}

@connectToStores([EditorStateStore], () => ({
    editor: EditorStateStore.getState(),
    project: ProjectStore.getState()
}))
export default class KeyframeEditor extends React.Component<KeyframeEditorProps, KeyframeEditorState> {

    private get activeEntityObject(): Delir.Project.Clip | Delir.Project.Effect | null {
        const { activeClip } = this.props
        const { activeEntity } = this.state

        if (activeClip) {
            if (activeEntity && activeEntity.type === 'effect') {
                return activeClip.effects.find(e => e.id === activeEntity.entityId)!
            } else {
                return activeClip
            }
        }

        return null
    }

    public static defaultProps: Partial<KeyframeEditorProps> = {
        scrollLeft: 0
    }

    public state: KeyframeEditorState = {
        activePropName: null,
        activeEntity: null,
        graphWidth: 0,
        graphHeight: 0,
        keyframeViewViewBox: undefined,
        editorOpened: false,
    }

    public refs: {
        svgParent: HTMLDivElement
    }

    public componentDidMount()
    {
        this._syncGraphHeight()
        window.addEventListener('resize', _.debounce(this._syncGraphHeight, 1000 / 30))
        mouseWheel(this.refs.svgParent, this.handleScrolling)
    }

    public componentWillReceiveProps(nextProps: KeyframeEditorProps)
    {
        if (!nextProps.activeClip) {
            this.setState({activePropName: null, editorOpened: false})
        }
    }

    public render()
    {
        const {activeClip, project: {project}, editor, scrollLeft} = this.props
        const {activePropName, activeEntity, keyframeViewViewBox, graphWidth, graphHeight, editorOpened} = this.state
        const activeEntityObject = this.activeEntityObject

        const activePropDescriptor = this._getDescriptorByPropId(activePropName)
        const descriptors = activeClip
            ? Delir.Engine.Renderers.getInfo(activeClip.renderer).parameter.properties || []
            : []

        const expressionCode = (!activeEntityObject || !activePropName) ? null : (
            activeEntityObject.expressions[activePropName]
                ? activeEntityObject.expressions[activePropName].code
                : null
        )

        let keyframes: Delir.Project.Keyframe[] | null = null
        if (activeClip && activeEntity) {
            if (activePropName) {
                if (activeEntity.type === 'effect') {
                    const activeEffect = activeClip.effects.find(e => e.id === activeEntity.entityId)
                    keyframes = activeEffect ? activeEffect.keyframes[activePropName] : null
                } else {
                    keyframes = activeClip.keyframes[activePropName]
                }
            }
        }

        return (
            <Workspace direction='horizontal' className={s.keyframeView}>
                <Pane className={s.propList}>
                    {activeClip && descriptors.map(desc => {
                        const value = activeClip
                            ? Delir.KeyframeHelper.calcKeyframeValueAt(editor.currentPreviewFrame, activeClip.placedFrame, desc, activeClip.keyframes[desc.propName] || [])
                            : undefined

                        const hasKeyframe = desc.animatable && (activeClip.keyframes[desc.propName] || []).length !== 0

                        return (
                            <div
                                key={activeClip!.id + desc.propName}
                                className={classnames(s.propItem, {
                                    [s['propItem--active']]: activeEntity && activeEntity.type === 'clip' && activePropName === desc.propName,
                                })}
                                data-entity-type='clip'
                                data-entity-id={activeClip.id}
                                data-prop-name={desc.propName}
                                onClick={this.selectProperty}
                            >
                                <ContextMenu>
                                    <MenuItem label={t('contextMenu.expression')} onClick={() => this._openExpressionEditor(desc.propName) } />
                                </ContextMenu>
                                <span className={classnames(
                                        s.propKeyframeIndicator,
                                        {
                                            [s['propKeyframeIndicator--hasKeyframe']]: hasKeyframe,
                                            [s['propKeyframeIndicator--nonAnimatable']]: !desc.animatable,
                                        })
                                    }
                                >
                                    {desc.animatable && (<i className='twa twa-clock12'></i>)}
                                </span>
                                <span className={s.propItemName}>{desc.label}</span>
                                <div className={s.propItemInput}>
                                    <DelirValueInput key={desc.propName} assets={project ? project.assets : null} descriptor={desc} value={value} onChange={this.valueChanged} />
                                </div>
                            </div>
                        )
                    })}
                    {this.renderEffectProperties()}
                </Pane>
                <Pane>
                    <div ref='svgParent' className={s.keyframeContainer} tabIndex={-1} onKeyDown={this.onKeydownOnKeyframeGraph} onWheel={this._scaleTimeline}>
                        {editorOpened && (
                            <ExpressionEditor
                                entityId={`${activeEntityObject!.id}-${activePropName}`}
                                title={activePropDescriptor!.label}
                                code={expressionCode}
                                onClose={this.onCloseEditor}
                            />
                        )}
                        <div className={s.measureContainer}>
                            <div ref='mesures' className={s.measureLayer} style={{transform: `translateX(-${scrollLeft}px)`}}>
                                {...this._renderMeasure()}
                            </div>
                        </div>
                        {activePropDescriptor && activeClip && keyframes && (
                            <KeyframeGraph
                                composition={editor.activeComp!}
                                parentClip={activeClip}
                                entity={activeEntityObject}
                                propName={activePropName!}
                                descriptor={activePropDescriptor}
                                width={graphWidth}
                                height={graphHeight}
                                viewBox={keyframeViewViewBox!}
                                scrollLeft={scrollLeft}
                                pxPerSec={this.props.pxPerSec}
                                zoomScale={this.props.scale}
                                keyframes={keyframes}
                                onKeyframeRemove={this.keyframeRemoved}
                                onModified={this.keyframeModified}
                            />
                        )}
                    </div>
                </Pane>
            </Workspace>
        )
    }

    private onCloseEditor = (result: ExpressionEditor.EditorResult) => {
        if (!result.saved) {
            this.setState({editorOpened: false})
            return
        }

        const { activeClip } = this.props
        const { activeEntity, activePropName } = this.state

        if (!activeClip || !activeEntity || !activePropName) return

        if (activeEntity.type === 'clip') {
            ProjectModActions.modifyClipExpression(activeClip.id, activePropName, {
                language: 'typescript',
                code: result.code,
            })
        } else {
            ProjectModActions.modifyEffectExpression(activeClip.id, activeEntity.entityId, activePropName, {
                language: 'typescript',
                code: result.code,
            })
        }
        this.setState({editorOpened: false})
    }

    private _syncGraphHeight = () =>
    {
        const box = this.refs.svgParent.getBoundingClientRect()

        this.setState({
            graphWidth: box.width,
            graphHeight: box.height,
            keyframeViewViewBox: `0 0 ${box.width} ${box.height}`,
        })
    }

    private _scaleTimeline = (e: React.WheelEvent<HTMLDivElement>) =>
    {
        if (e.altKey) {
            const newScale = this.props.scale + (e.deltaY * .05)
            this.props.onScaled(Math.max(newScale, .1))
            e.preventDefault()
        }
    }

    private handleScrolling = (dx: number, dy: number) =>
    {
        this.props.onScroll(dx, dy)
    }

    private selectProperty = ({currentTarget}: React.MouseEvent<HTMLDivElement>) =>
    {
        const { entityType, entityId, propName } = currentTarget.dataset as {[_: string]: string}

        this.setState({
            activeEntity: {
                type: entityType as 'clip' | 'effect',
                entityId,
            },
            activePropName: propName,
        })
    }

    private valueChanged = (desc: Delir.AnyParameterTypeDescriptor, value: any) =>
    {
        const {activeClip, editor: {currentPreviewFrame}} = this.props
        if (!activeClip) return

        const frameOnClip = currentPreviewFrame - activeClip.placedFrame
        ProjectModActions.createOrModifyKeyframeForClip(activeClip.id!, desc.propName, frameOnClip, {value})
        AppActions.seekPreviewFrame(this.props.editor.currentPreviewFrame)
    }

    private effectValueChanged = (effectId: string, desc: Delir.AnyParameterTypeDescriptor, value: any) =>
    {
        const {activeClip, editor: {currentPreviewFrame}} = this.props
        const { activeEntity } = this.state
        if (!activeClip) return

        const frameOnClip = currentPreviewFrame - activeClip.placedFrame
        ProjectModActions.createOrModifyKeyframeForEffect(activeClip.id, effectId, desc.propName, frameOnClip, {value})
        AppActions.seekPreviewFrame(currentPreviewFrame)
    }

    private keyframeModified = (parentClipId: string, propName: string, frameOnClip: number, patch: KeyframePatch) =>
    {
        const { activeEntity } = this.state
        if (!activeEntity) return

        if (activeEntity.type === 'clip') {
            ProjectModActions.createOrModifyKeyframeForClip(parentClipId, propName, frameOnClip, patch)
        } else {
            ProjectModActions.createOrModifyKeyframeForEffect(parentClipId, activeEntity.entityId, propName, frameOnClip, patch)
        }
    }

    private keyframeRemoved = (parentClipId: string, keyframeId: string) =>
    {
        const { activeEntity } = this.state
        if (!activeEntity) return

        if (activeEntity.type === 'clip') {
            ProjectModActions.removeKeyframe(activeEntity.entityId)
        } else {
            ProjectModActions.removeKeyframeForEffect(parentClipId, activeEntity.entityId, keyframeId)
        }
    }

    private _openExpressionEditor = (propName: string) => {
        const {activeClip} = this.props
        this.setState({editorOpened: true, activePropName: propName})
        this.forceUpdate()
    }

    private removeEffect = ({dataset}: MenuItemProps<{clipId: string, effectId: string}>) =>
    {
        this.setState({ editorOpened: false, activePropName: null, activeEntity: null }, () => {
            ProjectModActions.removeEffect(dataset.clipId, dataset.effectId)
            AppActions.seekPreviewFrame(this.props.editor.currentPreviewFrame)
        })
    }

    private renderEffectProperties = () =>
    {
        const { activeClip, editor, project: { project } } = this.props
        const { activeEntity, activePropName } = this.state
        const elements: React.ReactElement<any>[] = []

        if (!activeClip) return null

        activeClip.effects.forEach(effect => {
            try {
                const processorInfo = RendererService.pluginRegistry.getPostEffectPlugins().find(entry => entry.id === effect.processor)!
                const descriptors = RendererService.pluginRegistry.getPostEffectParametersById(effect.processor)!
                const propElements: React.ReactElement<any>[] = []

                descriptors.forEach(desc => {
                    const hasKeyframe = desc.animatable && (effect.keyframes[desc.propName] || []).length !== 0

                    const value = activeClip
                        ? Delir.KeyframeHelper.calcKeyframeValueAt(editor.currentPreviewFrame, activeClip.placedFrame, desc, effect.keyframes[desc.propName] || [])
                        : undefined

                    propElements.push((
                        <div
                            key={activeClip!.id + desc.propName}
                            className={classnames(s.propItem, {
                                [s['propItem--active']]: activeEntity && activeEntity.type === 'effect' && activeEntity.entityId === effect.id && activePropName === desc.propName,
                            })}
                            data-prop-name={desc.propName}
                            data-entity-type='effect'
                            data-entity-id={effect.id}
                            onClick={this.selectProperty}
                        >
                            <ContextMenu>
                                <MenuItem label={t('contextMenu.expression')} onClick={() => this._openExpressionEditor(desc.propName) } />
                            </ContextMenu>
                            <span className={classnames(
                                    s.propKeyframeIndicator,
                                    {
                                        [s['propKeyframeIndicator--hasKeyframe']]: hasKeyframe,
                                        [s['propKeyframeIndicator--nonAnimatable']]: !desc.animatable,
                                    })
                                }
                            >
                                {desc.animatable && (<i className='twa twa-clock12'></i>)}
                            </span>
                            <span className={s.propItemName}>{desc.label}</span>
                            <div className={s.propItemInput}>
                                <DelirValueInput key={desc.propName} assets={project ? project.assets : null} descriptor={desc} value={value} onChange={this.effectValueChanged.bind(null, effect.id)} />
                            </div>
                        </div>
                    ))
                })

                elements.push((
                    <div className={classnames(s.propItem, s['propItem--effectContainer'])}>
                        <div key={effect.id} className={classnames(s.propItem, s['propItem--header'])}>
                            <ContextMenu>
                                <MenuItem label={t('contextMenu.removeEffect')} data-clip-id={activeClip.id} data-effect-id={effect.id} onClick={this.removeEffect} />
                            </ContextMenu>
                            <i className='fa fa-magic' />
                            {`${processorInfo.name}`}
                        </div>
                        {...propElements}
                    </div>
                ))
            } catch (e) {
                if (e instanceof Delir.Exceptions.UnknownPluginReferenceException) {
                    elements.push((
                        <div className={classnames(s.propItem, s['propItem--effectContainer'])}　title={t('pluginMissing', {processorId: effect.processor})}>
                            <div key={effect.id} className={classnames(s.propItem, s['propItem--header'], s['propItem--pluginMissing'])}>
                                <ContextMenu>
                                    <MenuItem label={t('contextMenu.removeEffect')} data-clip-id={activeClip.id} data-effect-id={effect.id} onClick={this.removeEffect} />
                                </ContextMenu>
                                <i className='fa fa-exclamation' />
                                {`${effect.processor}`}
                            </div>
                        </div>
                    ))
                } else {
                    throw e
                }
            }
        })

        return elements
    }

    private _renderMeasure = (): JSX.Element[] =>
    {
        const {activeComposition} = this.props
        if (! activeComposition) return []

        const {measures} = this.props
        const components: JSX.Element[] = []

        for (const point of measures) {
            components.push(
                <div
                    key={point.index}
                    className={classnames(s.measureLine, {
                        [s['--grid']]: point.frameNumber % 10 === 0,
                        [s['--endFrame']]: point.frameNumber === activeComposition.durationFrames,
                    })}
                    style={{left: point.left}}
                >
                    {point.frameNumber}
                </div>
            )
        }

        return components
    }

    private _getDescriptorByPropId(propName: string | null)
    {
        const activeEntityObject = this.activeEntityObject

        if (!activeEntityObject) return null

        let parameters: Delir.AnyParameterTypeDescriptor[]

        if (activeEntityObject instanceof Delir.Project.Clip) {
            const info = Delir.Engine.Renderers.getInfo(activeEntityObject.renderer)
            parameters = info ? info.parameter.properties : []
        } else if (activeEntityObject instanceof Delir.Project.Effect) {
            parameters =  RendererService.pluginRegistry.getPostEffectParametersById(activeEntityObject.processor) || []
        } else {
            throw new Error('Unexpected entity type')
        }

        return parameters.find(desc => desc.propName === propName) || null
    }
}
