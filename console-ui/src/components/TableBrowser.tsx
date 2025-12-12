import React from 'react'
import { List, Button, Spin, Typography, Space } from 'antd'
import { TableOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { Table } from '../services/api'

const { Text } = Typography

interface TableBrowserProps {
  tables: Table[]
  loading: boolean
  onTableSelect: (tableName: string) => void
}

const TableBrowser: React.FC<TableBrowserProps> = ({ 
  tables, 
  loading, 
  onTableSelect 
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin />
        <div style={{ marginTop: '8px' }}>
          <Text type="secondary">Loading tables...</Text>
        </div>
      </div>
    )
  }

  if (!tables || tables.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Text type="secondary">No tables available</Text>
      </div>
    )
  }

  return (
    <List
      size="small"
      dataSource={tables}
      renderItem={(table) => (
        <List.Item style={{ padding: '8px 0' }}>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <TableOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              <Text strong style={{ fontSize: '12px' }}>
                {table.name}
              </Text>
            </div>
            <Space size="small" style={{ width: '100%' }}>
              <Button
                size="small"
                type="link"
                style={{ padding: '0', height: 'auto', fontSize: '11px' }}
                onClick={() => onTableSelect(table.name)}
              >
                Select *
              </Button>
              {table.info && (
                <Button
                  size="small"
                  type="link"
                  icon={<InfoCircleOutlined />}
                  style={{ padding: '0', height: 'auto', fontSize: '11px' }}
                >
                  Info
                </Button>
              )}
            </Space>
          </div>
        </List.Item>
      )}
    />
  )
}

export default TableBrowser