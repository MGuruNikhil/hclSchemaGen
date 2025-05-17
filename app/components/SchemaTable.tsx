'use client';

import { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';

const DATA_TYPES = [
    "bigint", "boolean", "char", "date", "decimal", "float", "integer",
    "json", "jsonb", "numeric", "real", "smallint", "text", "time",
    "timestamp", "timestamptz", "uuid", "varchar",
];

type SchemaRow = {
    name: string;
    type: string;
    isNullable: boolean;
    isPrimary: boolean;
    isUnique: boolean;
    defaultValue: string;
};

export default function SchemaTable() {
    const [modelName, setModelName] = useState("");
    const [rows, setRows] = useState<SchemaRow[]>([
        { name: "", type: "", isNullable: false, isPrimary: false, isUnique: false, defaultValue: "" }
    ]);
    const [hclOutput, setHclOutput] = useState("");

    const columnHelper = createColumnHelper<SchemaRow>();
    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'Field Name',
            cell: ({ row, getValue }) => (
                <input
                    value={getValue() || ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        setRows(prev => prev.map((r, index) =>
                            index === row.index ? { ...r, name: value } : r
                        ));
                    }}
                    className="border border-gray-700 p-1 w-full bg-gray-800 text-white"
                    placeholder="Field name"
                />
            ),
        }),
        columnHelper.accessor('type', {
            header: 'Type',
            cell: ({ row, getValue }) => (
                <select
                    value={getValue() || ''}
                    onChange={e => {
                        const value = e.target.value;
                        setRows(prev => prev.map((r, index) =>
                            index === row.index ? { ...r, type: value } : r
                        ));
                    }}
                    className="border border-gray-700 p-1 w-full bg-gray-800 text-white"
                >
                    <option value="" className="bg-gray-800">Select type</option>
                    {DATA_TYPES.map(type => (
                        <option key={type} value={type} className="bg-gray-800">{type}</option>
                    ))}
                </select>
            ),
        }),
        columnHelper.accessor('isNullable', {
            header: 'Nullable',
            cell: ({ row, getValue }) => (
                <input
                    type="checkbox"
                    checked={getValue()}
                    onChange={e => {
                        const checked = e.target.checked;
                        setRows(prev => prev.map((r, index) =>
                            index === row.index ? { ...r, isNullable: checked } : r
                        ));
                    }}
                    className="w-4 h-4"
                />
            ),
        }),
        columnHelper.accessor('isPrimary', {
            header: 'Primary',
            cell: ({ row, getValue }) => (
                <input
                    type="checkbox"
                    checked={getValue()}
                    onChange={e => {
                        const checked = e.target.checked;
                        setRows(prev => prev.map((r, index) =>
                            index === row.index ? { ...r, isPrimary: checked } : r
                        ));
                    }}
                    className="w-4 h-4"
                />
            ),
        }),
        columnHelper.accessor('isUnique', {
            header: 'Unique',
            cell: ({ row, getValue }) => (
                <input
                    type="checkbox"
                    checked={getValue()}
                    onChange={e => {
                        const checked = e.target.checked;
                        setRows(prev => prev.map((r, index) =>
                            index === row.index ? { ...r, isUnique: checked } : r
                        ));
                    }}
                    className="w-4 h-4"
                />
            ),
        }),
        columnHelper.accessor('defaultValue', {
            header: 'Default Value',
            cell: ({ row, getValue }) => (
                <input
                    value={getValue() || ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        setRows(prev => prev.map((r, index) =>
                            index === row.index ? { ...r, defaultValue: value } : r
                        ));
                    }}
                    className="border border-gray-700 p-1 w-full bg-gray-800 text-white"
                    placeholder="Default value"
                />
            ),
        }),
        columnHelper.display({
            id: 'actions',
            cell: ({ row }) => (
                <button
                    onClick={() => handleRemoveRow(row.index)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    disabled={rows.length === 1}
                >
                    Remove
                </button>
            ),
        }),
    ], [columnHelper, handleRemoveRow, rows.length]);

    const table = useReactTable({
        data: rows,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    function handleAddRow() {
        setRows([...rows, { name: "", type: "", isNullable: false, isPrimary: false, isUnique: false, defaultValue: "" }]);
    }

    function handleRemoveRow(idx: number) {
        setRows(rows.filter((_, i) => i !== idx));
    }

    function generateHCL() {
        let hcl = 'schema "public" {\n';
        hcl += `  table "${modelName}" {\n`;
        rows.forEach(r => {
            hcl += `    column "${r.name}" {\n`;
            hcl += `      type = ${r.type}\n`;
            hcl += `      null = ${r.isNullable}\n`;
            if (r.defaultValue) hcl += `      default = "${r.defaultValue}"\n`;
            hcl += `    }\n`;
        });
        // Primary key block
        const pkCols = rows.filter(r => r.isPrimary).map(r => `column.${r.name}`);
        if (pkCols.length) {
            hcl += `    primary_key {\n`;
            hcl += `      columns = [${pkCols.join(", ")}]\n`;
            hcl += `    }\n`;
        }
        // Unique indexes
        rows.filter(r => r.isUnique).forEach(r => {
            hcl += `    index "idx_${r.name}" {\n`;
            hcl += `      columns = [column.${r.name}]\n`;
            hcl += `      unique = true\n`;
            hcl += `    }\n`;
        });
        hcl += `  }\n`;
        hcl += `}\n`;
        setHclOutput(hcl);
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Model Name:
                    <input
                        value={modelName}
                        onChange={e => setModelName(e.target.value)}
                        className="ml-2 border rounded p-1 bg-gray-800 text-white"
                        placeholder="Enter model name"
                    />
                </label>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-700">
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="border border-gray-700 p-2 font-semibold text-white">
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="border border-gray-700 p-2 bg-gray-900">
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="space-x-4">
                <button
                    onClick={handleAddRow}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Add Field
                </button>
                <button
                    onClick={generateHCL}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Generate Schema
                </button>
            </div>

            {hclOutput && (
                <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2 text-white">Generated HCL Schema:</h3>
                    <pre className="p-4 rounded overflow-x-auto border border-gray-700 bg-gray-800 text-white">
                        {hclOutput}
                    </pre>
                </div>
            )}
        </div>
    );
}