'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'

type SchemaRow = {
  name: string
  type: string
  isNullable: boolean
  isPrimary: boolean
  isUnique: boolean
  defaultValue: string
}

type SchemaTableProps = {
  schemas?: string[]
  dataTypes?: string[]
}

export default function SchemaTable({
  schemas = ['public', 'application'],
  dataTypes = [
    'bigint', 'boolean', 'char', 'date', 'decimal', 'float', 'integer',
    'json', 'jsonb', 'numeric', 'real', 'smallint', 'text', 'time',
    'timestamp', 'timestamptz', 'uuid', 'varchar',
  ],
}: SchemaTableProps) {
  const [schema, setSchema] = useState(schemas[0])
  const [modelName, setModelName] = useState('')
  const [rows, setRows] = useState<SchemaRow[]>([
    { name: '', type: '', isNullable: false, isPrimary: false, isUnique: false, defaultValue: '' },
  ])
  const [hclOutput, setHclOutput] = useState('')

  const handleAddRow = useCallback(() => {
    setRows(rs => [...rs, { name: '', type: '', isNullable: false, isPrimary: false, isUnique: false, defaultValue: '' }])
  }, [])

  const handleRemoveRow = useCallback((idx: number) => {
    setRows(rs => rs.filter((_, i) => i !== idx))
  }, [])

  const columnHelper = createColumnHelper<SchemaRow>()
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'field name',
        cell: ({ row, getValue }) => (
          <input
            value={getValue() || ''}
            onChange={e => setRows(rs => rs.map((r, i) => i === row.index ? { ...r, name: e.target.value } : r))}
            className='border border-gray-600 p-2 w-full bg-gray-700 text-white rounded'
            placeholder='name'
          />
        ),
      }),
      columnHelper.accessor('type', {
        header: 'type',
        cell: ({ row, getValue }) => (
          <select
            value={getValue() || ''}
            onChange={e => setRows(rs => rs.map((r, i) => i === row.index ? { ...r, type: e.target.value } : r))}
            className='border border-gray-600 p-2 w-full bg-gray-700 text-white rounded'
          >
            <option value=''>select</option>
            {dataTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ),
      }),
      columnHelper.accessor('isNullable', {
        header: 'nullable',
        cell: ({ row, getValue }) => (
          <input
            type='checkbox'
            checked={getValue()}
            onChange={e => setRows(rs => rs.map((r, i) => i === row.index ? { ...r, isNullable: e.target.checked } : r))}
            className='h-5 w-5 text-blue-500'
          />
        ),
      }),
      columnHelper.accessor('isPrimary', {
        header: 'primary',
        cell: ({ row, getValue }) => (
          <input
            type='checkbox'
            checked={getValue()}
            onChange={e => setRows(rs => rs.map((r, i) => i === row.index ? { ...r, isPrimary: e.target.checked } : r))}
            className='h-5 w-5 text-green-400'
          />
        ),
      }),
      columnHelper.accessor('isUnique', {
        header: 'unique',
        cell: ({ row, getValue }) => (
          <input
            type='checkbox'
            checked={getValue()}
            onChange={e => setRows(rs => rs.map((r, i) => i === row.index ? { ...r, isUnique: e.target.checked } : r))}
            className='h-5 w-5 text-yellow-300'
          />
        ),
      }),
      columnHelper.accessor('defaultValue', {
        header: 'default',
        cell: ({ row, getValue }) => (
          <input
            value={getValue() || ''}
            onChange={e => setRows(rs => rs.map((r, i) => i === row.index ? { ...r, defaultValue: e.target.value } : r))}
            className='border border-gray-600 p-2 w-full bg-gray-700 text-white rounded'
            placeholder='default'
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        cell: ({ row }) => (
          <button
            onClick={() => handleRemoveRow(row.index)}
            className='px-3 py-1 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50'
            disabled={rows.length === 1}
          >remove</button>
        ),
      }),
    ],
    [columnHelper, dataTypes, handleRemoveRow, rows.length]
  )

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  const generateHCL = useCallback(() => {
    if (!modelName.trim() || rows.some(r => !r.name.trim() || !r.type)) {
      window.alert('fill all names + types before generating')
      return
    }
    let hcl = `schema \"${schema}\" {\n  table \"${modelName.trim()}\" {\n`
    const valid = rows.filter(r => r.name.trim() && r.type)
    valid.forEach(r => {
      hcl += `    column \"${r.name}\" {\n      type = ${r.type}\n      null = ${r.isNullable}\n`
      if (r.defaultValue) hcl += `      default = \"${r.defaultValue}\"\n`
      hcl += `    }\n`
    })
    const pk = valid.filter(r => r.isPrimary).map(r => `column.${r.name}`)
    if (pk.length) hcl += `    primary_key { columns = [${pk.join(', ')}] }\n`
    valid.filter(r => r.isUnique).forEach(r => {
      hcl += `    index \"idx_${r.name}\" { columns = [column.${r.name}] unique = true }\n`
    })
    hcl += `  }\n}\n`
    setHclOutput(hcl)
  }, [schema, modelName, rows])

  return (
    <div className='bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6 max-w-4xl mx-auto'>
      <div className='flex items-center space-x-6'>
        <select
          value={schema}
          onChange={e => setSchema(e.target.value)}
          className='border rounded p-2 bg-gray-700 text-white'
        >{schemas.map(s => <option key={s}>{s}</option>)}</select>
        <input
          value={modelName}
          onChange={e => setModelName(e.target.value)}
          placeholder='model name'
          className='border rounded p-2 w-full bg-gray-700 text-white'
        />
      </div>
      <div className='overflow-x-auto rounded shadow-inner'>
        <table className='min-w-full divide-y divide-gray-600'>
          <thead className='bg-gray-700'>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>{hg.headers.map(h => (
                <th key={h.id} className='px-4 py-2 text-left text-sm font-semibold text-gray-200'>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}</tr>
            ))}
          </thead>
          <tbody className='divide-y divide-gray-600'>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id} className='bg-gray-900 hover:bg-gray-700'>
                {r.getVisibleCells().map(c => (
                  <td key={c.id} className='px-4 py-3 text-sm text-gray-100'>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='flex justify-end space-x-4'>
        <button onClick={handleAddRow} className='px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600'>add</button>
        <button onClick={generateHCL} className='px-6 py-3 bg-green-500 rounded-lg hover:bg-green-600'>generate</button>
      </div>
      {hclOutput && (
        <pre className='bg-gray-900 p-4 rounded text-sm overflow-x-auto text-green-200'>{hclOutput}</pre>
      )}
    </div>
  )
}
