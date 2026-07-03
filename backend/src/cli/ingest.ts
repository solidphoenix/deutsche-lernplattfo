import { rebuildKnowledgeIndex } from '../agent/rag.js'

async function main() {
  const result = await rebuildKnowledgeIndex()
  console.log(`Indexierung abgeschlossen: ${result.indexedFiles} Dateien, ${result.indexedChunks} Chunks.`)
  if (result.warning) {
    console.warn(result.warning)
  }
}

main().catch((error) => {
  console.error('Indexierung fehlgeschlagen:', error)
  process.exitCode = 1
})
