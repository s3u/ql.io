import React, { useRef } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute: () => void
}

const SqlEditor: React.FC<SqlEditorProps> = ({ value, onChange, onExecute }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    
    // Add keyboard shortcut for execution (Ctrl+Enter or Cmd+Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onExecute()
    })
  }

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '')
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      theme="vs-light"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
      }}
    />
  )
}

export default SqlEditor