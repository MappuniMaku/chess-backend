export class PaginatedListDto<ItemType> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: ItemType[];
}
