import { Request, Response, NextFunction } from 'express';
import { productService } from './products.service';
import {
  createProductSchema,
  updateProductSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
  productQuerySchema,
} from './products.validation';

export class ProductController {
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

  async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = productQuerySchema.parse(req.query);
      const result = await productService.listProducts(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

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

  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductSchema.parse(req.body);
      const updated = await productService.updateProduct(req.params.id, validated);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.deleteProduct(req.params.id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async createVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProductVariantSchema.parse(req.body);
      const variant = await productService.createVariant(req.params.id, validated);

      res.status(201).json({
        success: true,
        message: 'Product variant created successfully',
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProductVariantSchema.parse(req.body);
      const updated = await productService.updateVariant(
        req.params.id,
        req.params.variantId,
        validated
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

  async deleteVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.deleteVariant(req.params.id, req.params.variantId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();

