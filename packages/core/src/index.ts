import * as Engine from './Engine'
import * as Exceptions from './Exceptions'
import * as PluginSupport from './PluginSupport'
import * as Values from './Values'

import { EffectPreRenderContext } from './Engine/RenderContext/EffectPreRenderContext'
import { EffectRenderContext } from './Engine/RenderContext/EffectRenderContext'
import PluginBase from './PluginSupport/PluginBase'
import PluginRegistry from './PluginSupport/PluginRegistry'
import PostEffectBase from './PluginSupport/PostEffectBase'
import Type, { AnyParameterTypeDescriptor, TypeDescriptor } from './PluginSupport/TypeDescriptor'

import * as KeyframeCalcurator from './Engine/KeyframeCalcurator'
import * as Exporter from './Exporter'
import * as MigrationHelper from './Migration/MigrationHelper'
import ProjectMigrator from './Migration/ProjectMigrator'

import * as Entity from './Entity'

const { version } = require('../package.json')

export {
  // Core (Namaspaces)
  Entity,
  Engine,
  PluginSupport,
  Exceptions,
  Values,
  // Plugins
  Type,
  TypeDescriptor,
  PluginBase,
  PostEffectBase,
  EffectPreRenderContext,
  EffectRenderContext,
  PluginRegistry,
  // import shorthand
  KeyframeCalcurator,
  ProjectMigrator,
  MigrationHelper,
  Exporter,
  // Types
  AnyParameterTypeDescriptor,
  version,
}
