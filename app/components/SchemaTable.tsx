"use client"

import { useState, useMemo, useCallback } from "react"
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Copy, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type SchemaRow = {
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

export default function SchemaTable({
  schemas = ["public", "application", "user"],
  dataTypes = [
    "bigint",
    "boolean",
    "char",
    "date",
    "decimal",
    "float",
    "integer",
    "json",
    "jsonb",
    "numeric",
    "real",
    "smallint",
    "text",
    "time",
    "timestamp",
    "timestamptz",
    "uuid",
    "varchar",
  ],
}: SchemaTableProps) {
  const isValidFieldName = (name: string) => {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)
  }

  const [showValidation, setShowValidation] = useState(false)
  const [schema, setSchema] = useState(schemas[0])
  const [modelName, setModelName] = useState("")
  const [rows, setRows] = useState<SchemaRow[]>([
    { name: "", type: "", isNullable: false, isUnique: false, defaultValue: "" },
  ])
  const [primaryIndex, setPrimaryIndex] = useState<number | null>(null)
  const [hclOutput, setHclOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const handleAddRow = useCallback(() => {
    setRows((rs) => [...rs, { name: "", type: "", isNullable: false, isUnique: false, defaultValue: "" }])
  }, [])

  const handleRemoveRow = useCallback(
    (idx: number) => {
      setRows((rs) => rs.filter((_, i) => i !== idx))
      if (primaryIndex === idx) setPrimaryIndex(null)
      else if (primaryIndex !== null && primaryIndex > idx) setPrimaryIndex(primaryIndex - 1)
    },
    [primaryIndex],
  )

  const columnHelper = createColumnHelper<SchemaRow>()
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Field Name",
        cell: ({ row, getValue }) => (
          <Input
            value={getValue() || ""}
            onChange={(e) => {
              const newValue = e.target.value
              setRows((rs) => {
                const newRows = [...rs]
                newRows[row.index] = { ...newRows[row.index], name: newValue }
                return newRows
              })
            }}
            placeholder="name"
            className={cn(
              "min-w-[120px]",
              !getValue() && rows[row.index].type && "border-yellow-500 dark:border-yellow-500",
              rows[row.index].name && !isValidFieldName(rows[row.index].name) && "border-red-500 dark:border-red-500",
            )}
            aria-invalid={rows[row.index].name ? !isValidFieldName(rows[row.index].name) : false}
          />
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: ({ row, getValue }) => (
          <Select
            value={getValue() || ""}
            onValueChange={(val) => {
              setRows((rs) => {
                const newRows = [...rs]
                newRows[row.index] = { ...newRows[row.index], type: val }
                return newRows
              })
            }}
          >
            <SelectTrigger
              className={cn(
                "min-w-[120px]",
                !getValue() && rows[row.index].name && "border-yellow-500 dark:border-yellow-500",
              )}
            >
              <SelectValue placeholder="select" />
            </SelectTrigger>
            <SelectContent>
              {dataTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      }),
      columnHelper.display({
        id: "primary",
        header: "Primary",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <input
              type="radio"
              checked={primaryIndex === row.index}
              onChange={() => setPrimaryIndex(row.index)}
              className="h-4 w-4 accent-primary"
            />
          </div>
        ),
      }),
      columnHelper.accessor("isNullable", {
        header: "Nullable",
        cell: ({ row, getValue }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={getValue()}
              onCheckedChange={(val) =>
                setRows((rs) => rs.map((r, i) => (i === row.index ? { ...r, isNullable: !!val } : r)))
              }
            />
          </div>
        ),
      }),
      columnHelper.accessor("isUnique", {
        header: "Unique",
        cell: ({ row, getValue }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={getValue()}
              onCheckedChange={(val) =>
                setRows((rs) => rs.map((r, i) => (i === row.index ? { ...r, isUnique: !!val } : r)))
              }
            />
          </div>
        ),
      }),
      columnHelper.accessor("defaultValue", {
        header: "Default",
        cell: ({ row, getValue }) => (
          <Input
            value={getValue() || ""}
            onChange={(e) => {
              const newValue = e.target.value
              setRows((rs) => {
                const newRows = [...rs]
                newRows[row.index] = { ...newRows[row.index], defaultValue: newValue }
                return newRows
              })
            }}
            placeholder="default"
            className="min-w-[120px]"
          />
        ),
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            disabled={rows.length === 1}
            onClick={() => handleRemoveRow(row.index)}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Remove row</span>
          </Button>
        ),
      }),
    ],
    [columnHelper, dataTypes, handleRemoveRow, primaryIndex, rows.length],
  )

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  const isRowValid = (row: SchemaRow) => {
    return row.name && isValidFieldName(row.name) && row.type
  }

  const isFormValid = () => {
    return modelName.trim() && rows.every(isRowValid)
  }

  const generateHCL = useCallback(() => {
    setShowValidation(true)

    if (!isFormValid()) {
      // Update field errors
      const errors: Record<string, string> = {}

      if (!modelName.trim()) {
        errors.modelName = "Model name is required"
      }

      rows.forEach((row, index) => {
        if (!row.name) {
          errors[`name_${index}`] = "Field name is required"
        } else if (!isValidFieldName(row.name)) {
          errors[`name_${index}`] =
            "Field name must start with a letter and contain only letters, numbers, and underscores"
        }

        if (!row.type) {
          errors[`type_${index}`] = "Type is required"
        }
      })

      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    let hcl = `schema "${schema}" {\n  table "${modelName.trim()}" {\n`

    rows.forEach((r) => {
      if (!r.name.trim() || !r.type) return
      hcl += `    column "${r.name}" {\n      type = ${r.type}\n      null = ${r.isNullable}\n`
      if (r.defaultValue) hcl += `      default = "${r.defaultValue}"\n`
      hcl += `    }\n`
    })

    if (primaryIndex !== null && rows[primaryIndex]?.name) {
      hcl += `    primary_key { columns = [column.${rows[primaryIndex].name}] }\n`
    }

    rows
      .filter((r) => r.isUnique && r.name)
      .forEach((r) => {
        hcl += `    index "idx_${r.name}" { columns = [column.${r.name}] unique = true }\n`
      })

    hcl += `  }\n}\n`
    setHclOutput(hcl)
  }, [schema, modelName, rows, primaryIndex])

  const copyToClipboard = useCallback(() => {
    if (!hclOutput) return
    navigator.clipboard.writeText(hclOutput)
    showSuccessToast()
  }, [hclOutput])

  const showSuccessToast = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isValid = isFormValid()

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Schema Builder</CardTitle>
        <CardDescription>Define your database schema and generate HCL configuration</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-1/3">
            <label className="text-sm font-medium mb-1 block">Schema</label>
            <Select value={schema} onValueChange={setSchema}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schemas.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-2/3">
            <label className="text-sm font-medium mb-1 block">Model Name</label>
            <Input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Enter model name"
              className={cn(showValidation && !modelName.trim() && "border-red-500 dark:border-red-500")}
              aria-invalid={showValidation && !modelName.trim()}
            />
            {showValidation && !modelName.trim() ? (
              <p className="text-red-500 text-sm mt-1">Model name is required</p>
            ) : (
              <p className="text-muted-foreground text-sm mt-1">Enter a name for your database table</p>
            )}
          </div>
        </div>

        <div className="border overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-center"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={handleAddRow} className="gap-1">
            <Plus className="h-4 w-4" /> Add Field
          </Button>
          <Button
            onClick={generateHCL}
            disabled={!isValid}
            className={cn("relative", !isValid && "opacity-50 cursor-not-allowed")}
          >
            {isValid ? "Generate HCL" : "Complete Required Fields"}
            {!isValid && showValidation && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </Button>
        </div>

        {hclOutput && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">HCL Output</h3>
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1">
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <pre className="p-4 rounded-md bg-muted overflow-x-auto text-sm">{hclOutput}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

