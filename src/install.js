'use strict'

import path from 'path'
import fs from 'fs-extra'
import YAML from 'yaml'
import parseJson from 'parse-json'
import { customAlphabet } from 'nanoid'

import {
  TEMPLATES_DIR,
  SERVICES_DIR,
  COMPOSE_DIR,
  VOLUMES_DIR
} from './constants.js'

import {
  readPackageJson,
  escape,
  docker,
  resetComposeDir
} from '../src/utils.js'

const nanoid = customAlphabet(
  '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  12
)

const OPTIONS_PATH = path.resolve(SERVICES_DIR, '.options')

/**
 * Helper methods
 */
const getName = (service) => {
  const withoutTag = service.replace(/:[a-z0-9_][a-z0-9_.-]{0,127}$/i, '')
  const [name] = withoutTag.split('/').slice(-1)

  return name
}

const fillTemplate = (template, data, removeSections, keepSections) => {
  for (const key in data) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
  }

  for (const r of removeSections) {
    template = template.replace(
      new RegExp(`{{${r}}}(.|\n)*{{/${r}}}\n?`, 'gm'),
      ''
    )
  }
  for (const k of keepSections) {
    template = template.replace(new RegExp(`{{/?${k}}}\n?`, 'gm'), '')
  }

  return template
}

const getOptions = () => {
  const raw =
    fs.existsSync(OPTIONS_PATH) &&
    fs.readFileSync(OPTIONS_PATH, { encoding: 'utf-8' })

  return raw ? parseJson(raw) : {}
}

const setOptions = (options) => {
  const raw = JSON.stringify(options, null, 2)
  fs.writeFileSync(OPTIONS_PATH, raw)
}

const ensureVolumesDir = async () => {
  fs.ensureDirSync(VOLUMES_DIR)
  fs.writeFileSync(path.resolve(VOLUMES_DIR, '.gitignore'), '*', 'utf8')
}

const ensureNamedVolumes = async (content) => {
  const data = YAML.parse(content)
  if (!data || !data.volumes) return

  const volumes = []
  for (const key in data.volumes) {
    if (!data.volumes[key].external) continue

    const name = data.volumes[key].external.name
    if (!name) continue

    volumes.push(name)
  }

  await Promise.all(
    volumes.map((v) =>
      docker('volume', 'create', `--name=${v}`, '--label=keep')
    )
  )
}

const writeFile = (name, data) => {
  const dest = path.resolve(COMPOSE_DIR, `${name}.yml`)

  fs.writeFileSync(dest, data, { encoding: 'utf8' })
}

const copyAdditionalFiles = (name) => {
  const src = path.resolve(TEMPLATES_DIR, name)
  const dest = path.resolve(SERVICES_DIR, name)

  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copySync(src, dest)
  }
}

const readServiceData = (service) => {
  if (typeof service === 'string') {
    return readStandardServiceData(service)
  } else if (typeof service === 'object') {
    return readCustomServiceData(service)
  }
}

const readCustomServiceData = (service) => {
  const image = service.image
  const name = getName(image)

  service.container_name = '{{container_name}}'

  const volumes = {}
  if (service.volumes) {
    for (const volume of service.volumes) {
      // Format: [SOURCE:]TARGET[:MODE]
      const volumeArray = volume.split(':')

      // volume is unnamed:
      if (volumeArray.length === 1) continue

      // => volume is named or mapped to a host path:
      const [volumeName] = volumeArray

      // volume has invalid volume name / volume is mapped to a host path
      // (@see https://github.com/moby/moby/issues/21786):
      if (!volumeName.match(/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/)) continue

      // volume is named => we add it to top level "volumes" directive:
      volumes[volumeName] = {
        external: {
          name: `{{projectname}}-${volumeName}`
        }
      }
    }
  }

  const templateObject = {
    version: '2.4',
    services: {
      [name]: service
    },
    volumes
  }

  const template = YAML.stringify(templateObject, {
    defaultKeyType: 'PLAIN',
    defaultStringType: 'QUOTE_DOUBLE'
  })

  return { name, image, template }
}

const readStandardServiceData = (service) => {
  const name = getName(service)
  const src = path.resolve(TEMPLATES_DIR, `${name}.yml`) // refactor with same line above

  const result = { image: service, name }

  const exists = fs.existsSync(src)
  if (exists) result.template = fs.readFileSync(src, { encoding: 'utf8' })

  return result
}

const serviceInstall = async (data, projectname, volumeType, volumesPrefix) => {
  const removeSections = ['mapped-volumes', 'named-volumes'].filter(
    (e) => e !== volumeType
  )
  const keepSections = [volumeType]

  const content = fillTemplate(
    data.template,
    {
      image: data.image,
      container_name: `${projectname}_${data.name}`,
      projectname,
      volumesPrefix
    },
    removeSections,
    keepSections
  )

  if (volumeType === 'mapped-volumes') {
    await ensureVolumesDir()
  }

  if (volumeType === 'named-volumes') {
    await ensureNamedVolumes(content)
  }

  writeFile(data.name, content)

  copyAdditionalFiles(data.name)
}

export const install = async (opts) => {
  const { services: all, name } = readPackageJson()
  const projectname = escape(name)

  // cleanse services from falsy values:
  const services = all.filter((s) => s)

  // validate custom services:
  const invalid = services.filter((s) => typeof s === 'object' && !s.image)
  if (invalid.length > 0) {
    throw Error(
      `Invalid custom services:\n${invalid
        .map((i) => JSON.stringify(i, null, 2))
        .join(',\n')}`
    )
  }

  // create services data:
  const data = services.map(readServiceData)

  // exit if not all services' images are supported:
  const unsupported = data.filter((d) => !d.template).map((d) => d.name)
  if (unsupported.length > 0) {
    throw Error(`Unsupported services: ${unsupported.join(', ')}`)
  }

  // install services:
  resetComposeDir(COMPOSE_DIR)

  const options = getOptions()

  if (opts.enableVolumesId) {
    const id = (options.volumes && options.volumes.id) || nanoid()

    options.volumes = {
      mode: 'volumes-id',
      id
    }

    setOptions(options)
  }

  if (opts.enableMappedVolumes) {
    options.volumes = {
      mode: 'mapped-volumes'
    }

    setOptions(options)
  }

  if (opts.enableClassicVolumes) {
    delete options.volumes

    setOptions(options)
  }

  if (options.volumes && options.volumes.mode === 'volumes-id') {
    const volumesPrefix = options.volumes.id
    await Promise.all(
      data.map((d) =>
        serviceInstall(d, projectname, 'named-volumes', volumesPrefix)
      )
    )
  } else if (options.volumes && options.volumes.mode === 'mapped-volumes') {
    await Promise.all(
      data.map((d) => serviceInstall(d, projectname, 'mapped-volumes'))
    )
  } else {
    const volumesPrefix = projectname
    await Promise.all(
      data.map((d) =>
        serviceInstall(d, projectname, 'named-volumes', volumesPrefix)
      )
    )
  }

  console.log(`Done (${services.length} services installed).`)
}
