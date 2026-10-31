import { Request, Response, NextFunction } from 'express';
import { ProductType } from '@prisma/client';
import { productService } from './product.service';
import {
  createProductSchema,
  updateProductSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
} from './product.validation';

export class ProductController {
  /**
   * GET /api/v1/products
   */
  async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const type = req.query.type as ProductType | undefined;
      const isActive =
        req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined;

      const products = await productService.listProducts({
        search,
        type,
        isActive,
      });

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/products/:id
   */
  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productService.getProductById(req.params.id);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/products
   */
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProductSchema.parse(req.body);
      const product = await productService.createProduct(validated);

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
   * PUT /api/v1/products/:id
   */
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductSchema.parse(req.body);
      const product = await productService.updateProduct(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/products/:id
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.deleteProduct(req.params.id);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:productId/variants
   */
  async createVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProductVariantSchema.parse(req.body);
      const variant = await productService.createVariant(req.params.productId, validated);

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
   * PUT /api/v1/products/:productId/variants/:variantId
   */
  async updateVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductVariantSchema.parse(req.body);
      const variant = await productService.updateVariant(
        req.params.productId,
        req.params.variantId,
        validated
      );

      res.status(200).json({
        success: true,
        message: 'Product variant updated successfully',
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/products/:productId/variants/:variantId
   */
  async deleteVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.deleteVariant(
        req.params.productId,
        req.params.variantId
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
