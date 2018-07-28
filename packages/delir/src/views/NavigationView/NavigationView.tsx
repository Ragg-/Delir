import { remote } from 'electron'
import * as path from 'path'
import * as React from 'react'
import connectToStores from '../../utils/Flux/connectToStores'

import AppActions from '../../actions/App'
import {default as EditorStateStore, EditorState } from '../../stores/EditorStateStore'

import Pane from '../components/pane'

import * as s from './style.sass'

interface NavigationViewProps {
    editor: EditorState,
}

@connectToStores([EditorStateStore], () => ({
    editor: EditorStateStore.getState()
}))
export default class NavigationView extends React.Component<NavigationViewProps, null>
{
    public render()
    {
        const {project, projectPath, previewPlayed} = this.props.editor
        const projectName = project
            ? 'Delir - ' + (projectPath ? path.basename(projectPath) : 'New Project')
            : 'Delir'

        document.title = projectName

        return (
            <Pane className={s.navigationView} resizable={false}>
                <ul className={s.titleBar} onDoubleClick={this.titleBarDoubleClicked}>
                    {projectName}
                </ul>
                <ul className={s.navigationList}>
                    {previewPlayed ? (
                            <li onClick={this.onClickPause}><i className='fa fa-pause' /></li>
                        ) : (
                            <li onClick={this.onClickPlay}><i className='fa fa-play' /></li>
                        )
                    }
                    <li onClick={this.onClickDest}><i className='fa fa-film' /></li>
                </ul>
            </Pane>
        )
    }

    private onClickPlay = action =>
    {
        const {activeComp} = this.props.editor

        if (! activeComp) return
        AppActions.startPreview(activeComp.id!)
    }

    private onClickPause = (e: React.MouseEvent<HTMLLIElement>) => {
        AppActions.stopPreview()
    }

    private onClickDest = action =>
    {
        const {activeComp} = this.props.editor
        activeComp && AppActions.renderDestinate(activeComp.id!)
    }

    private titleBarDoubleClicked = e =>
    {
        const browserWindow = remote.getCurrentWindow()
        browserWindow.isMaximized() ? browserWindow.unmaximize() : browserWindow.maximize()
    }
}
