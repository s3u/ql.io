import axios from 'axios'

const API_BASE = '/api'

export interface Table {
  name: string
  about: string
  info: string
}

class QLIOApi {
  private client = axios.create({
    baseURL: API_BASE,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  async getTables(): Promise<Table[]> {
    const response = await this.client.get('/tables')
    return response.data
  }

  async executeQuery(query: string): Promise<any> {
    const response = await this.client.post('/q', { q: query })
    return response.data
  }

  async getTableInfo(tableName: string): Promise<any> {
    const response = await this.client.get(`/table?name=${tableName}`)
    return response.data
  }
}

export const qlioApi = new QLIOApi()