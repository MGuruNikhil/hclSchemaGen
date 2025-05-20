"use client"

import { useState, useMemo, useCallback } from "react"
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, ColumnDef, RowData } from "@tanstack/react-table"
import { nanoid } from "nanoid"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Copy, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type SchemaRow = {
  id: string
  name: string
  type: string
  isNullable: boolean
  isUnique: boolean
  defaultValue: string
}

type SchemaTableProps = {
  schemas?: string[]
  dataTypes?: string[]
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerAlign?: 'left' | 'center' | 'right';
  }
}

const isValidFieldName = (name: string) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)

interface TableMeta {
  updateRow: (rowId: string, columnId: keyof SchemaRow, value: SchemaRow[typeof columnId]) => void
  setPrimaryId: (id: string | null) => void
  primaryId: string | null
  dataTypes: string[]
  showValidation: boolean
  isValidFieldName: (name: string) => boolean
}

export default function SchemaTable({
  schemas = ["public", "application", "user"],
  dataTypes = [
    "bigint", "boolean", "char", "date", "decimal", "float", "integer", "json", "jsonb", "numeric", "real", "smallint", "text", "time", "timestamp", "timestamptz", "uuid", "varchar",
  ],
}: SchemaTableProps) {
  const [showValidation, setShowValidation] = useState(false)
  const [schema, setSchema] = useState(schemas[0])
  const [modelName, setModelName] = useState("")
  const [rows, setRows] = useState<SchemaRow[]>([{
    id: nanoid(), name: "", type: dataTypes[0] || "", isNullable: false, isUnique: false, defaultValue: ""
  }])
  const [primaryId, setPrimaryId] = useState<string | null>(null)
  const [hclOutput, setHclOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const handleAddRow = useCallback(() => {
    setRows(rs => [...rs, { id: nanoid(), name: "", type: dataTypes[0] || "", isNullable: false, isUnique: false, defaultValue: "" }])
  }, [dataTypes])

  const handleRemoveRow = useCallback((id: string) => {
    setRows(rs => rs.filter(r => r.id !== id))
    if (primaryId === id) setPrimaryId(null)
  }, [primaryId])

  const updateRow = useCallback((rowId: string, columnId: keyof SchemaRow, value: SchemaRow[typeof columnId]) => {
    setRows(oldRows =>
      oldRows.map(row =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      )
    )
  }, [])

  const columns = useMemo(() => {
    const helper = createColumnHelper<SchemaRow>()
    return [
      helper.accessor("name", {
        header: "Field Name",
        minSize: 150,
        size: 200,
        cell: info => {
          const { id, name } = info.row.original
          const { updateRow, showValidation: metaShowValidation, isValidFieldName: metaIsValidFieldName } = info.table.options.meta as TableMeta
          return (
            <Input
              value={name}
              onChange={e => updateRow(id, 'name', e.target.value)}
              placeholder="name"
              className={cn(
                "w-full",
                metaShowValidation && !name.trim() && "border-red-500 dark:border-red-500",
                name.trim() && !metaIsValidFieldName(name) && "border-red-500 dark:border-red-500"
              )}
              aria-invalid={!!(metaShowValidation && (!name.trim() || (name.trim() && !metaIsValidFieldName(name))))}
            />
          )
        }
      }),
      helper.accessor("type", {
        header: "Type",
        minSize: 120,
        size: 160,
        cell: info => {
          const { id, type } = info.row.original
          const { updateRow, dataTypes: metaDataTypes, showValidation: metaShowValidation } = info.table.options.meta as TableMeta
          return (
            <Select
              value={type}
              onValueChange={val => updateRow(id, 'type', val)}
            >
              <SelectTrigger className={cn("w-full", metaShowValidation && !type && "border-red-500 dark:border-red-500")}>
                <SelectValue placeholder="select type" />
              </SelectTrigger>
              <SelectContent>
                {metaDataTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )
        }
      }),
      helper.display({
        id: "primary",
        header: "Primary",
        minSize: 70,
        size: 80,
        meta: { headerAlign: 'center' },
        cell: info => {
          const { primaryId: metaPrimaryId, setPrimaryId: metaSetPrimaryId } = info.table.options.meta as TableMeta
          return (
            <div className="flex justify-center">
              <input
                type="radio"
                name={`primary_key_radio_${info.table}`}
                checked={metaPrimaryId === info.row.original.id}
                onChange={() => metaSetPrimaryId(info.row.original.id)}
                className="h-4 w-4 accent-primary"
                aria-label={`Set ${info.row.original.name || 'this field'} as primary key`}
              />
            </div>
          )
        }
      }),
      helper.accessor("isNullable", {
        header: "Nullable",
        minSize: 70,
        size: 80,
        meta: { headerAlign: 'center' },
        cell: info => {
          const { updateRow } = info.table.options.meta as TableMeta
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={info.getValue()}
                onCheckedChange={val => updateRow(info.row.original.id, 'isNullable', !!val)}
                aria-label={`Set ${info.row.original.name || 'this field'} as nullable`}
              />
            </div>
          )
        }
      }),
      helper.accessor("isUnique", {
        header: "Unique",
        minSize: 70,
        size: 80,
        meta: { headerAlign: 'center' },
        cell: info => {
          const { updateRow } = info.table.options.meta as TableMeta
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={info.getValue()}
                onCheckedChange={val => updateRow(info.row.original.id, 'isUnique', !!val)}
                aria-label={`Set ${info.row.original.name || 'this field'} as unique`}
              />
            </div>
          )
        }
      }),
      helper.accessor("defaultValue", {
        header: "Default",
        minSize: 120,
        size: 160,
        cell: info => {
          const { id, defaultValue } = info.row.original
          const { updateRow } = info.table.options.meta as TableMeta
          return (
            <Input
              value={defaultValue}
              onChange={e => updateRow(id, 'defaultValue', e.target.value)}
              placeholder="default value"
              className="w-full"
            />
          )
        }
      }),
      helper.display({
        id: "actions",
        header: () => null,
        minSize: 50,
        size: 60,
        meta: { headerAlign: 'center' },
        cell: info => (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              disabled={info.table.options.data.length === 1}
              onClick={() => handleRemoveRow(info.row.original.id)}
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              aria-label={`Remove field ${info.row.original.name || 'this field'}`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove row</span>
            </Button>
          </div>
        )
      })
    ] as ColumnDef<SchemaRow>[]
  }, [handleRemoveRow])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
    meta: {
      updateRow,
      setPrimaryId,
      primaryId,
      dataTypes,
      showValidation,
      isValidFieldName,
    } as TableMeta,
  })

  const isValid = useMemo(() => {
    if (!modelName.trim()) return false
    if (rows.length === 0) return false
    for (const r of rows) {
      if (!r.name.trim() || !isValidFieldName(r.name) || !r.type) return false
    }
    return true
  }, [modelName, rows])

  const generateHCL = () => {
    setShowValidation(true)
    if (!isValid) return
    let hcl = `schema "${schema}" {\n  table "${modelName.trim().toLowerCase().replace(/\s+/g, '_')}" {\n`
    rows.forEach(r => {
      hcl += `    column "${r.name.trim()}" {\n      type = ${r.type}\n      null = ${r.isNullable}\n`
      if (r.defaultValue.trim()) hcl += `      default = "${r.defaultValue.trim()}"\n`
      hcl += `    }\n`
    })
    if (primaryId) {
      const pk = rows.find(r => r.id === primaryId)
      if (pk) hcl += `    primary_key { columns = [column.${pk.name.trim()}] }\n`
    }
    rows.filter(r => r.isUnique && r.name.trim()).forEach(r => {
      hcl += `    index "idx_${modelName.trim().toLowerCase().replace(/\s+/g, '_')}_${r.name.trim()}" { columns = [column.${r.name.trim()}] unique = true }\n`
    })
    hcl += `  }\n}\n`
    setHclOutput(hcl)
  }

  const copyToClipboard = () => {
    if (!hclOutput) return
    navigator.clipboard.writeText(hclOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="rounded-none w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle>Schema Builder</CardTitle>
        <CardDescription>Define your database schema and generate HCL configuration</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-1/3">
            <label htmlFor="schema-select" className="text-sm font-medium mb-1 block">Schema</label>
            <Select value={schema} onValueChange={setSchema}>
              <SelectTrigger id="schema-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schemas.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-2/3">
            <label htmlFor="model-name-input" className="text-sm font-medium mb-1 block">Model Name</label>
            <Input
              id="model-name-input"
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              placeholder="Enter model name (e.g., users, products)"
              className={cn("w-full", showValidation && !modelName.trim() && "border-red-500 dark:border-red-500")}
              aria-invalid={showValidation && !modelName.trim()}
              aria-describedby={showValidation && !modelName.trim() ? "model-name-error" : "model-name-description"}
            />
            {showValidation && !modelName.trim()
              ? <p id="model-name-error" className="text-red-500 text-sm mt-1">Model name is required.</p>
              : <p id="model-name-description" className="text-muted-foreground text-sm mt-1">Enter a name for your database table.</p>
            }
          </div>
        </div>

        <div className="border rounded-md overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} className="border-b">
                    {hg.headers.map(h => (
                      <th
                        key={h.id}
                        className="h-10 px-3 py-2 font-medium text-muted-foreground whitespace-nowrap"
                        style={{
                          width: h.getSize(),
                          textAlign: h.column.columnDef.meta?.headerAlign || 'left',
                        }}
                      >
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/20 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="p-2"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {showValidation && rows.some(r => !r.name.trim() || !isValidFieldName(r.name) || !r.type) && (
          <p className="text-red-500 text-sm mb-4 -mt-2">One or more fields have invalid names or missing types. Please correct them.</p>
        )}


        <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center mb-6 gap-3">
          <Button variant="outline" onClick={handleAddRow} className="gap-1 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add Field
          </Button>
          <Button
            onClick={generateHCL}
            className={cn("relative w-full sm:w-auto", !isValid && "opacity-70 cursor-not-allowed")}
            disabled={!isValid && showValidation}
          >
            {isValid || !showValidation ? "Generate HCL" : "Fix Errors to Generate"}
            {!isValid && showValidation && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
          </Button>
        </div>

        {hclOutput && (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
              <h3 className="text-lg font-semibold">HCL Output</h3>
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1 self-start sm:self-center">
                <Copy className="h-3.5 w-3.5" />{copied ? "Copied!" : "Copy HCL"}
              </Button>
            </div>
            <pre className="p-4 rounded-md bg-muted/80 text-sm leading-relaxed overflow-x-auto">{hclOutput}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
