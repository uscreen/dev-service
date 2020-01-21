#!/usr/bin/env node

const chalk = require('chalk')
const cli = require('commander')
const path = require('path')
const fs = require('fs-extra')
const readPkgUp = require('read-pkg-up')

/**
 * Initialize
 */

// Dev-Service
const { version } = require('../package.json')
const TEMPLATES_DIR = path.resolve(__dirname, '../templates')

// Project
const root = path.resolve(process.cwd())
const { packageJson } = readPkgUp.sync({ cwd: root })
const services = packageJson.services

const SERVICES_DIR = path.resolve(process.cwd(), '.services')

const project = packageJson.name || path.basename(root)

/**
 * Helper methods
 */
const ensureServicesDir = () => {
  fs.removeSync(SERVICES_DIR)
  fs.ensureDirSync(SERVICES_DIR)
}

const getName = service => {
  const [name] = service.split(':')

  return name
}

const error = e => {
  console.error(chalk.red(`ERROR: ${e.message} Aborting.`))
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
    container_name: `${project}_${name}`,
    project: project
  })

  writeFile(name, data)
}

cli.version(version).action(async () => {
  try {
    ensureServicesDir(SERVICES_DIR)
    await Promise.all(services.map(serviceInstall))
  } catch (e) {
    error(e)
  }
})

cli.parse(process.argv)
