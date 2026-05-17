#!/usr/bin/env node
// Clawd Desktop Pet — OpenCode Plugin Installer
// Safely installs the OpenCode plugin to the appropriate directory

const fs = require("fs")
const path = require("path")
const os = require("os")

const PLUGIN_FILENAME = "clawd-opencode.ts"
const PLUGIN_SOURCE = path.resolve(__dirname, PLUGIN_FILENAME)

/**
 * Get the OpenCode plugins directory
 * Priority: 1) Project-level .opencode/plugins, 2) Global ~/.config/opencode/plugins
 */
function getInstallDir(options = {}) {
  const home = os.homedir()
  
  // Global directory
  const globalDir = path.join(home, ".config", "opencode", "plugins")
  
  // Project-level directory (check current working directory)
  const projectDir = path.join(process.cwd(), ".opencode", "plugins")
  
  if (options.global) {
    return globalDir
  }
  
  // Check if we're in a project with .opencode directory
  if (fs.existsSync(path.join(process.cwd(), ".opencode"))) {
    return projectDir
  }
  
  // Default to global
  return globalDir
}

/**
 * Install the OpenCode plugin
 */
function install(options = {}) {
  const installDir = getInstallDir(options)
  const targetPath = path.join(installDir, PLUGIN_FILENAME)

  // Check if source file exists
  if (!fs.existsSync(PLUGIN_SOURCE)) {
    const err = `Plugin source not found: ${PLUGIN_SOURCE}`
    if (!options.silent) console.error("❌", err)
    return { success: false, error: err }
  }

  try {
    // Create directory if it doesn't exist
    fs.mkdirSync(installDir, { recursive: true })
    
    // Copy plugin file
    fs.copyFileSync(PLUGIN_SOURCE, targetPath)
    
    if (!options.silent) {
      console.log(`✅ Clawd OpenCode plugin installed to: ${targetPath}`)
      console.log(``)
      console.log(`📋 Installation details:`)
      console.log(`   Location: ${options.global ? "Global" : "Project-level"}`)
      console.log(`   File: ${targetPath}`)
      console.log(``)
      console.log(`📝 Next steps:`)
      console.log(`   1. Restart OpenCode to load the plugin`)
      console.log(`   2. Start Clawd desktop pet: npm start`)
      console.log(`   3. The pet will now react to OpenCode events!`)
      console.log(``)
      console.log(`🔄 To uninstall: node hooks/install-opencode.js uninstall`)
    }
    
    return { success: true, path: targetPath }
  } catch (err) {
    const msg = `Installation failed: ${err.message}`
    if (!options.silent) console.error("❌", msg)
    return { success: false, error: msg }
  }
}

/**
 * Uninstall the OpenCode plugin
 */
function uninstall(options = {}) {
  // Try both locations
  const locations = [
    path.join(os.homedir(), ".config", "opencode", "plugins", PLUGIN_FILENAME),
    path.join(process.cwd(), ".opencode", "plugins", PLUGIN_FILENAME),
  ]

  let uninstalled = false
  let lastError = null

  for (const targetPath of locations) {
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath)
        if (!options.silent) {
          console.log(`✅ Plugin uninstalled from: ${targetPath}`)
        }
        uninstalled = true
      }
    } catch (err) {
      lastError = err
      if (!options.silent) {
        console.warn(`⚠️  Could not remove ${targetPath}: ${err.message}`)
      }
    }
  }

  if (!uninstalled) {
    if (!options.silent) {
      console.log(`ℹ️  Plugin not found in standard locations`)
    }
    if (lastError) {
      return { success: false, error: lastError.message }
    }
  } else {
    if (!options.silent) {
      console.log(``)
      console.log(`📝 Restart OpenCode to complete uninstallation`)
    }
  }

  return { success: true }
}

/**
 * Check if plugin is installed
 */
function checkInstallation() {
  const locations = [
    path.join(os.homedir(), ".config", "opencode", "plugins", PLUGIN_FILENAME),
    path.join(process.cwd(), ".opencode", "plugins", PLUGIN_FILENAME),
  ]

  for (const location of locations) {
    if (fs.existsSync(location)) {
      return { installed: true, path: location }
    }
  }
  
  return { installed: false }
}

// Export for programmatic use
module.exports = { install, uninstall, checkInstallation }

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]
  const options = {
    global: args.includes("--global") || args.includes("-g"),
    silent: args.includes("--silent") || args.includes("-s"),
  }

  switch (command) {
    case "uninstall":
    case "remove":
    case "rm": {
      const result = uninstall(options)
      process.exit(result.success ? 0 : 1)
      break
    }
    
    case "check":
    case "status": {
      const status = checkInstallation()
      if (status.installed) {
        console.log(`✅ Plugin is installed at: ${status.path}`)
        process.exit(0)
      } else {
        console.log(`ℹ️  Plugin is not installed`)
        console.log(`   Install with: node hooks/install-opencode.js`)
        process.exit(1)
      }
      break
    }
    
    case "install":
    default: {
      const result = install(options)
      process.exit(result.success ? 0 : 1)
      break
    }
  }
}
