import { useState } from 'react'
import { Layout, Typography, Button, Space, Divider } from 'antd'
import { PlayCircleOutlined, TableOutlined, HistoryOutlined } from '@ant-design/icons'
import SqlEditor from './components/SqlEditor'
import ResultsViewer from './components/ResultsViewer'
import TableBrowser from './components/TableBrowser'
import { useQuery } from 'react-query'
import { qlioApi } from './services/api'
import './index.css'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

interface QueryResult {
  data?: any
  error?: string
  loading: boolean
}

function App() {
  const [query, setQuery] = useState('show tables')
  const [queryResult, setQueryResult] = useState<QueryResult>({ loading: false })
  const [siderCollapsed, setSiderCollapsed] = useState(false)

  // Fetch available tables
  const { data: tables, isLoading: tablesLoading } = useQuery(
    'tables',
    () => qlioApi.getTables(),
    {
      refetchOnMount: true,
    }
  )

  const executeQuery = async () => {
    if (!query.trim()) return

    setQueryResult({ loading: true })
    
    try {
      const result = await qlioApi.executeQuery(query)
      setQueryResult({ data: result, loading: false })
    } catch (error: any) {
      setQueryResult({ 
        error: error.message || 'Query execution failed', 
        loading: false 
      })
    }
  }

  const handleTableSelect = (tableName: string) => {
    setQuery(`select * from ${tableName} limit 5`)
  }

  return (
    <Layout className="console-layout">
      <Header className="console-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              ql.io Modern Console
            </Title>
            <Text type="secondary">
              Interactive SQL-like queries for REST APIs
            </Text>
          </div>
          <Space>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={executeQuery}
              loading={queryResult.loading}
              size="large"
            >
              Execute Query
            </Button>
          </Space>
        </div>
      </Header>

      <Layout className="console-content">
        <Sider 
          width={300}
          collapsible
          collapsed={siderCollapsed}
          onCollapse={setSiderCollapsed}
          style={{ background: '#fff' }}
        >
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <TableOutlined style={{ marginRight: '8px' }} />
              <Text strong>Available Tables</Text>
            </div>
            <TableBrowser 
              tables={tables || []}
              loading={tablesLoading}
              onTableSelect={handleTableSelect}
            />
          </div>
        </Sider>

        <Layout>
          <Content className="editor-panel">
            <div className="editor-toolbar">
              <Space>
                <Text strong>SQL Query Editor</Text>
                <Divider type="vertical" />
                <Button 
                  size="small" 
                  icon={<HistoryOutlined />}
                >
                  History
                </Button>
              </Space>
            </div>
            <div className="editor-container">
              <SqlEditor 
                value={query}
                onChange={setQuery}
                onExecute={executeQuery}
              />
            </div>
          </Content>

          <Content className="results-panel">
            <div className="results-container">
              <ResultsViewer 
                result={queryResult.data}
                error={queryResult.error}
                loading={queryResult.loading}
              />
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App