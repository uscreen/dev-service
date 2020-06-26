#!/usr/bin/env node

const cli = require('commander')
const path = require('path')
const fs = require('fs-extra')
const YAML = require('yaml')

const {
  version,
  TEMPLATES_DIR,
  SERVICES_DIR,
  COMPOSE_DIR
} = require('../src/constants')

const {
  readPackageJson,
  docker,
  error,
  resetComposeDir
} = require('../src/utils')

/**
 * Helper methods
 */
const getName = service => {
  const [fullname] = service.split(':')
  const [name] = fullname.split('/').slice(-1)

  return name
}

const fillTemplate = (template, data) => {
  for (const key in data) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
  }

  return template
}

const ensureVolumes = async content => {
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
    volumes.map(v => docker('volume', 'create', `--name=${v}`, '--label=keep'))
  )
}

const writeFile = (name, data) => {
  const dest = path.resolve(COMPOSE_DIR, `${name}.yml`)

  fs.writeFileSync(dest, data, { encoding: 'utf8' })
}

const copyAdditionalFiles = name => {
  const src = path.resolve(TEMPLATES_DIR, name)
  const dest = path.resolve(SERVICES_DIR, name)

  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    fs.copySync(src, dest)
  }
}

const readServiceData = service => {
  if (typeof service === 'string') {
    return readStandardServiceData(service)
  } else if (typeof service === 'object') {
    return readCustomServiceData(service)
  }
}

const readCustomServiceData = service => {
  const name = getName(service.image)
  const image = service.image
  const template = YAML.stringify({ version: '2.4', ...service.template })

  return { name, image, template }
}

const readStandardServiceData = service => {
  const name = getName(service)
  const src = path.resolve(TEMPLATES_DIR, `${name}.yml`) // refactor with same line above

  const result = { image: service, name }

  const exists = fs.existsSync(src)
  if (exists) result.template = fs.readFileSync(src, { encoding: 'utf8' })

  return result
}

const serviceInstall = async (data, projectname) => {
  const content = fillTemplate(data.template, {
    image: data.image,
    container_name: `${projectname}_${data.name}`,
    projectname: projectname
  })

  await ensureVolumes(content)

  writeFile(data.name, content)

  copyAdditionalFiles(data.name)
}

const install = async () => {
  const { services, projectname } = await readPackageJson()

  const data = services.map(readServiceData)

  const invalid = data.filter(d => !d.template).map(d => d.name)
  if (invalid.length > 0) {
    throw Error(`Invalid services: ${invalid.join(', ')}`)
  }

  resetComposeDir(COMPOSE_DIR)
  await Promise.all(data.map(d => serviceInstall(d, projectname)))

  console.log(`Done (${services.length} services installed).`)
}

cli.version(version).action(async () => {
  try {
    await install()
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)
