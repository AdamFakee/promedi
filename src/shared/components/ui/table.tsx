import { ArchiveX } from 'lucide-react-native'
import React from 'react'
import { ScrollView, Text, View, ViewProps } from 'react-native'
import { cn } from '@/shared/utils'

type EntityId = string | number

type BaseTableEntity = {
  id?: EntityId
}

export type TableColumn<Entry> = {
  title: string
  field: keyof Entry
  width?: number
  className?: string
  headerClassName?: string
  cellClassName?: string
  Cell?: ({ entry }: { entry: Entry }) => React.ReactNode
}

export interface TablePaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export type TableProps<Entry extends BaseTableEntity> = {
  data: Entry[]
  columns: TableColumn<Entry>[]
  pagination?: TablePaginationProps
  className?: string
  emptyTitle?: string
  emptyDescription?: string
}

interface TableElementProps extends ViewProps {
  className?: string
}

export const TableElement = ({ className, children, ...props }: TableElementProps) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
      <View
        className={cn(
          'w-full overflow-hidden rounded-2xl border border-outline-variant',
          className,
        )}
        {...props}
      >
        {children}
      </View>
    </ScrollView>
  )
}

interface TableRowProps extends ViewProps {
  className?: string
}

export const TableRow = ({ className, ...props }: TableRowProps) => {
  return <View className={cn('flex-row border-b border-outline-variant', className)} {...props} />
}

interface TableCellProps extends ViewProps {
  className?: string
  width?: number
}

export const TableHead = ({ className, width, ...props }: TableCellProps) => {
  return (
    <View
      className={cn('min-h-12 justify-center bg-surface-100 px-4 py-3', className)}
      style={[width ? { width } : { flex: 1 }, props.style]}
      {...props}
    />
  )
}

export const TableCell = ({ className, width, ...props }: TableCellProps) => {
  return (
    <View
      className={cn('min-h-12 justify-center px-4 py-3', className)}
      style={[width ? { width } : { flex: 1 }, props.style]}
      {...props}
    />
  )
}

const TablePagination = ({ page, totalPages, onPageChange }: TablePaginationProps) => {
  const canPrevious = page > 1
  const canNext = page < totalPages

  return (
    <View className="mt-4 flex-row items-center justify-end gap-3">
      <Text className="font-medium text-sm text-muted">
        Trang {page}/{totalPages}
      </Text>
      <Text
        className={cn(
          'rounded-lg px-3 py-2 font-bold text-sm',
          canPrevious ? 'text-primary' : 'text-neutral-400',
        )}
        onPress={() => canPrevious && onPageChange(page - 1)}
      >
        Trước
      </Text>
      <Text
        className={cn(
          'rounded-lg px-3 py-2 font-bold text-sm',
          canNext ? 'text-primary' : 'text-neutral-400',
        )}
        onPress={() => canNext && onPageChange(page + 1)}
      >
        Sau
      </Text>
    </View>
  )
}

export const Table = <Entry extends BaseTableEntity>({
  data,
  columns,
  pagination,
  className,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Chưa có bản ghi nào để hiển thị.',
}: TableProps<Entry>) => {
  if (!data?.length) {
    return (
      <View className={cn('h-80 items-center justify-center rounded-2xl bg-white px-6', className)}>
        <ArchiveX size={64} color="#A3A3A3" strokeWidth={1.5} />
        <Text className="mt-4 text-center text-lg font-black text-secondary">{emptyTitle}</Text>
        <Text className="mt-2 text-center font-medium text-sm text-neutral-400">
          {emptyDescription}
        </Text>
      </View>
    )
  }

  return (
    <View className={className}>
      <TableElement>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead
              key={`${column.title}-${index}`}
              width={column.width}
              className={cn(column.className, column.headerClassName)}
            >
              <Text className="font-bold text-sm text-muted" numberOfLines={1}>
                {column.title}
              </Text>
            </TableHead>
          ))}
        </TableRow>

        {data.map((entry, entryIndex) => (
          <TableRow
            key={entry.id ?? entryIndex}
            className={entryIndex === data.length - 1 ? 'border-b-0' : undefined}
          >
            {columns.map(
              (
                { Cell, field, title, width, className: columnClassName, cellClassName },
                columnIndex,
              ) => (
                <TableCell
                  key={`${title}-${columnIndex}`}
                  width={width}
                  className={cn(columnClassName, cellClassName)}
                >
                  {Cell ? (
                    <>{Cell({ entry })}</>
                  ) : (
                    <Text className="font-medium text-sm text-surface-on" numberOfLines={2}>
                      {String(entry[field] ?? '')}
                    </Text>
                  )}
                </TableCell>
              ),
            )}
          </TableRow>
        ))}
      </TableElement>

      {pagination && <TablePagination {...pagination} />}
    </View>
  )
}
