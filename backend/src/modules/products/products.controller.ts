import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  listProductsQuerySchema,
  createVariantSchema,
  updateVariantSchema,
  calculatePriceSchema,
} from './products.validation';

export class ProductsController {
  /**
   * POST /api/v1/products
   * Create a new product with optional initial variants. (Admin only)
   */
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProductSchema.parse(req.body);
      const product = await productsService.createProduct(validated as any);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/products
   * List products with pagination, search, filters, and role-based field sanitization.
   */
  async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listProductsQuerySchema.parse(req.query);
      const userRole = req.user!.role;
      const result = await productsService.listProducts(query as any, userRole);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/products/:id
   * Get single product details by ID.
   */
  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = req.user!.role;
      const product = await productsService.getProductById(req.params.id, userRole);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/products/:id
   * Update product attributes. (Admin only)
   */
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductSchema.parse(req.body);
      const updated = await productsService.updateProduct(req.params.id, validated as any);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/products/:id/status
   * Activate or deactivate a product. (Admin only)
   */
  async updateProductStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductStatusSchema.parse(req.body);
      const updated = await productsService.updateProductStatus(req.params.id, validated.isActive);

      res.status(200).json({
        success: true,
        message: `Product ${validated.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/products/:id
   * Delete or archive product with historical reference protection. (Admin only)
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productsService.deleteProduct(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:id/variants
   * Add a new variant to a product. (Admin only)
   */
  async createVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createVariantSchema.parse(req.body);
      const variant = await productsService.createVariant(req.params.id, validated as any);

      res.status(201).json({
        success: true,
        message: 'Product variant created successfully',
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/products/:id/variants/:variantId
   * Update an existing variant. (Admin only)
   */
  async updateVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateVariantSchema.parse(req.body);
      const updated = await productsService.updateVariant(
        req.params.id,
        req.params.variantId,
        validated as any
      );

      res.status(200).json({
        success: true,
        message: 'Product variant updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/products/:id/variants/:variantId
   * Delete or archive a variant with reference protection. (Admin only)
   */
  async deleteVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productsService.deleteVariant(req.params.id, req.params.variantId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:id/calculate-price or POST /api/v1/products/calculate-price
   * Calculate final selling price with selected variant add-ons.
   */
  async calculatePrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id || req.body.productId;
      const validated = calculatePriceSchema.parse({
        productId,
        selectedVariantIds: req.body.selectedVariantIds || [],
      });

      const calculation = await productsService.calculatePrice(
        validated.productId,
        validated.selectedVariantIds
      );

      res.status(200).json({
        success: true,
        data: calculation,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productsController = new ProductsController();
