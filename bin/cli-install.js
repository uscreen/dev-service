#!/usr/bin/env node

const cli = require('commander')
const path = require('path')
const fs = require('fs-extra')

const {
  version,
  TEMPLATES_DIR,
  services,
  SERVICES_DIR,
  projectname
} = require('../src/constants')

const { error, resetServiceDir } = require('../src/helpers')

/**
 * Helper methods
 */
const getName = service => {
  const [name] = service.split(':')

  return name
}

const readTemplate = name => {
  const src = path.resolve(TEMPLATES_DIR, `${name}.yml`)

  return fs.readFileSync(src, { encoding: 'utf8' })
}

const fillTemplate = (template, data) => {
  for (const key in data) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
  }

  return template
}

const writeFile = (name, data) => {
  const dest = path.resolve(SERVICES_DIR, `${name}.yml`)

  fs.writeFileSync(dest, data, { encoding: 'utf8' })
}

const serviceInstall = async service => {
  const name = getName(service)

  const template = readTemplate(name)

  const data = fillTemplate(template, {
    image: service,
    container_name: `${projectname}_${name}`,
    project: projectname
  })

  writeFile(name, data)
}

const install = async () => {
  resetServiceDir(SERVICES_DIR)
  await Promise.all(services.map(serviceInstall))

  console.log(`Done (${services.length} service installed).`)
}

cli.version(version).action(async () => {
  try {
    await install()
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)
