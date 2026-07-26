/**
 * Interface for a Category
 */
export interface Category {
  _id: string;
  name: string;
  type: 'expense' | 'income' | 'both';
  icon?: string;
  color?: string;
  parentId?: string | null;
  isDefault?: boolean;
  order?: number;
  children?: Category[];
}

/**
 * Hierarchical structure for categories
 */
export interface CategoriesTree {
  expense: Category[];
  income: Category[];
}
