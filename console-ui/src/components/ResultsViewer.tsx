import React, { useState } from 'react'
import { Card, Table, Alert, Spin, Tabs, Button, Space, Typography } from 'antd'
import { DownloadOutlined, CopyOutlined } from '@ant-design/icons'
// Simple JSON viewer component

const { Text } = Typography
const { TabPane } = Tabs

interface ResultsViewerProps {
  result?: any
  error?: string
  loading: boolean
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ result, error, loading }) => {
  const [activeTab, setActiveTab] = useState('table')

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Executing query...</Text>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Query Error"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <Text type="secondary">
            Execute a query to see results here
          </Text>
        </div>
      </Card>
    )
  }

  const isArray = Array.isArray(result)
  const hasData = isArray ? result.length > 0 : true

  const renderTableView = () => {
    if (!isArray || result.length === 0) {
      return <Text type="secondary">No tabular data to display</Text>
    }

    // Generate columns from first row
    const firstRow = result[0]
    const columns = Object.keys(firstRow).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (value: any) => {
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        return String(value)
      }
    }))

    // Add row keys
    const dataSource = result.map((row: any, index: number) => ({
      ...row,
      key: index
    }))

    return (
      <Table
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: true }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Total ${total} items`
        }}
      />
    )
  }

  const exportData = () => {
    const dataStr = JSON.stringify(result, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'query-results.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyData = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>Query Results</Text>
          <Space>
            <Text type="secondary">
              {isArray ? `${result.length} rows` : '1 result'}
            </Text>
            <Button 
              size="small" 
              icon={<CopyOutlined />}
              onClick={copyData}
            >
              Copy
            </Button>
            <Button 
              size="small" 
              icon={<DownloadOutlined />}
              onClick={exportData}
            >
              Export
            </Button>
          </Space>
        </div>
      }
    >
      {hasData ? (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Table View" key="table">
            {renderTableView()}
          </TabPane>
          <TabPane tab="JSON View" key="json">
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '16px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </TabPane>
        </Tabs>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">No data returned</Text>
        </div>
      )}
    </Card>
  )
}

export default ResultsViewer