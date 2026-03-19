# Horeca1 — Part 6: OpenAPI v3 Specification

```yaml
openapi: 3.0.3
info:
  title: Horeca1 B2B Marketplace API
  description: REST API for Horeca1 multi-vendor wholesale marketplace
  version: 1.0.0
  contact:
    name: Horeca1 Team

servers:
  - url: https://horeca1.com/api/v1
    description: Production
  - url: http://localhost:3000/api/v1
    description: Development

tags:
  - name: Auth
  - name: Vendors
  - name: Catalog
  - name: Inventory
  - name: Cart
  - name: Orders
  - name: QuickOrderLists
  - name: Payments
  - name: Credit
  - name: Notifications
  - name: Serviceability
  - name: Admin

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        success: { type: boolean, example: false }
        error:
          type: object
          properties:
            code: { type: string, example: "VALIDATION_ERROR" }
            message: { type: string }
            details: { type: object }

    Pagination:
      type: object
      properties:
        next_cursor: { type: string, nullable: true }
        has_more: { type: boolean }

    User:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        role: { type: string, enum: [customer, vendor, admin] }
        full_name: { type: string }
        pincode: { type: string }
        business_name: { type: string }

    Session:
      type: object
      properties:
        access_token: { type: string }
        refresh_token: { type: string }
        expires_at: { type: integer }

    VendorSummary:
      type: object
      properties:
        id: { type: string, format: uuid }
        business_name: { type: string }
        slug: { type: string }
        logo_url: { type: string }
        rating: { type: number }
        min_order_value: { type: number }
        credit_enabled: { type: boolean }
        delivery_info: { type: string }

    VendorDetail:
      type: object
      allOf:
        - $ref: '#/components/schemas/VendorSummary'
        - type: object
          properties:
            description: { type: string }
            banner_url: { type: string }
            delivery_slots: { type: array, items: { $ref: '#/components/schemas/DeliverySlot' } }
            categories: { type: array, items: { $ref: '#/components/schemas/CategorySummary' } }

    DeliverySlot:
      type: object
      properties:
        day: { type: string }
        slot: { type: string }
        cutoff: { type: string }

    CategorySummary:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        slug: { type: string }
        image_url: { type: string }

    Product:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        slug: { type: string }
        image_url: { type: string }
        pack_size: { type: string }
        base_price: { type: number }
        price_slabs: { type: array, items: { $ref: '#/components/schemas/PriceSlab' } }
        credit_eligible: { type: boolean }
        in_stock: { type: boolean }
        qty_available: { type: integer }

    PriceSlab:
      type: object
      properties:
        min_qty: { type: integer }
        max_qty: { type: integer, nullable: true }
        price: { type: number }

    CartGroup:
      type: object
      properties:
        vendor: { $ref: '#/components/schemas/VendorSummary' }
        items: { type: array, items: { $ref: '#/components/schemas/CartItemDetail' } }
        subtotal: { type: number }
        meets_mov: { type: boolean }

    CartItemDetail:
      type: object
      properties:
        product_id: { type: string, format: uuid }
        name: { type: string }
        quantity: { type: integer }
        unit_price: { type: number }
        total: { type: number }

    Order:
      type: object
      properties:
        id: { type: string, format: uuid }
        order_number: { type: string }
        vendor_id: { type: string, format: uuid }
        status: { type: string, enum: [pending, confirmed, processing, shipped, delivered, cancelled] }
        total_amount: { type: number }
        payment_status: { type: string, enum: [unpaid, paid, partial, refunded] }
        created_at: { type: string, format: date-time }

    QuickOrderList:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        vendor: { $ref: '#/components/schemas/VendorSummary' }
        item_count: { type: integer }
        updated_at: { type: string, format: date-time }

    CreditInfo:
      type: object
      properties:
        credit_limit: { type: number }
        credit_used: { type: number }
        available: { type: number }
        status: { type: string, enum: [pending, active, suspended, closed] }

paths:
  # ── AUTH ──
  /auth/signup:
    post:
      tags: [Auth]
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, full_name, role]
              properties:
                email: { type: string, format: email }
                phone: { type: string }
                password: { type: string, minLength: 8 }
                full_name: { type: string }
                role: { type: string, enum: [customer, vendor] }
                pincode: { type: string }
                business_name: { type: string }
      responses:
        '201':
          description: User registered
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      user: { $ref: '#/components/schemas/User' }
                      session: { $ref: '#/components/schemas/Session' }
        '400': { description: Validation error }
        '409': { description: Duplicate email/phone }

  /auth/login:
    post:
      tags: [Auth]
      summary: Login with email + password
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string }
                password: { type: string }
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      user: { $ref: '#/components/schemas/User' }
                      session: { $ref: '#/components/schemas/Session' }
        '401': { description: Invalid credentials }

  /auth/me:
    get:
      tags: [Auth]
      summary: Get current user profile
      security: [{ BearerAuth: [] }]
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data: { $ref: '#/components/schemas/User' }

  # ── VENDORS ──
  /vendors:
    get:
      tags: [Vendors]
      summary: List vendors by pincode
      parameters:
        - name: pincode
          in: query
          schema: { type: string }
        - name: category_id
          in: query
          schema: { type: string, format: uuid }
        - name: sort
          in: query
          schema: { type: string, enum: [rating, name, min_order_value] }
        - name: order
          in: query
          schema: { type: string, enum: [asc, desc], default: desc }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 50 }
      responses:
        '200':
          description: Vendor list
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      vendors:
                        type: array
                        items: { $ref: '#/components/schemas/VendorSummary' }
                      pagination: { $ref: '#/components/schemas/Pagination' }

  /vendors/{id}:
    get:
      tags: [Vendors]
      summary: Get vendor store details
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Vendor detail
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data: { $ref: '#/components/schemas/VendorDetail' }

  /vendors/{id}/products:
    get:
      tags: [Vendors]
      summary: Get vendor product catalog
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
        - name: category_id
          in: query
          schema: { type: string, format: uuid }
        - name: search
          in: query
          schema: { type: string }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
      responses:
        '200':
          description: Product list
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      products:
                        type: array
                        items: { $ref: '#/components/schemas/Product' }
                      pagination: { $ref: '#/components/schemas/Pagination' }

  # ── SEARCH ──
  /products/search:
    get:
      tags: [Catalog]
      summary: Search products across vendors (FTS + pgvector)
      parameters:
        - name: q
          in: query
          required: true
          schema: { type: string }
        - name: pincode
          in: query
          schema: { type: string }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
      responses:
        '200':
          description: Search results (3 blocks)
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      products: { type: array, items: { $ref: '#/components/schemas/Product' } }
                      vendors: { type: array, items: { $ref: '#/components/schemas/VendorSummary' } }
                      categories: { type: array, items: { $ref: '#/components/schemas/CategorySummary' } }

  # ── CART ──
  /cart:
    get:
      tags: [Cart]
      summary: View cart (vendor-grouped)
      security: [{ BearerAuth: [] }]
      responses:
        '200':
          description: Cart contents
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      vendor_groups:
                        type: array
                        items: { $ref: '#/components/schemas/CartGroup' }
                      total: { type: number }

  /cart/items:
    post:
      tags: [Cart]
      summary: Add item to cart
      security: [{ BearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [product_id, vendor_id, quantity]
              properties:
                product_id: { type: string, format: uuid }
                vendor_id: { type: string, format: uuid }
                quantity: { type: integer, minimum: 1 }
      responses:
        '201': { description: Item added }

  /cart/checkout:
    post:
      tags: [Cart]
      summary: Validate and initiate checkout
      security: [{ BearerAuth: [] }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                payment_method: { type: string, enum: [razorpay, credit, wallet] }
      responses:
        '200': { description: Checkout validation results }

  # ── ORDERS ──
  /orders:
    post:
      tags: [Orders]
      summary: Create Purchase Order(s)
      security: [{ BearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                vendor_orders:
                  type: array
                  items:
                    type: object
                    properties:
                      vendor_id: { type: string, format: uuid }
                      items:
                        type: array
                        items:
                          type: object
                          properties:
                            product_id: { type: string, format: uuid }
                            quantity: { type: integer }
                      delivery_slot_id: { type: string, format: uuid }
                      notes: { type: string }
                payment_method: { type: string }
      responses:
        '201':
          description: Orders created
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      orders: { type: array, items: { $ref: '#/components/schemas/Order' } }
    get:
      tags: [Orders]
      summary: List orders
      security: [{ BearerAuth: [] }]
      parameters:
        - name: status
          in: query
          schema: { type: string }
        - name: vendor_id
          in: query
          schema: { type: string, format: uuid }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
      responses:
        '200':
          description: Order list

  /orders/reorder/{id}:
    post:
      tags: [Orders]
      summary: Reorder a past order
      security: [{ BearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '201': { description: New order created from past order }

  # ── PAYMENTS ──
  /payments/initiate:
    post:
      tags: [Payments]
      summary: Create Razorpay order
      security: [{ BearerAuth: [] }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [order_id, method]
              properties:
                order_id: { type: string, format: uuid }
                method: { type: string, enum: [razorpay] }
      responses:
        '200':
          description: Razorpay order created
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      razorpay_order_id: { type: string }
                      amount: { type: integer }
                      currency: { type: string }
                      key_id: { type: string }

  /payments/verify:
    post:
      tags: [Payments]
      summary: Verify Razorpay payment (webhook)
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                razorpay_order_id: { type: string }
                razorpay_payment_id: { type: string }
                razorpay_signature: { type: string }
      responses:
        '200': { description: Payment verified }

  # ── CREDIT ──
  /credit/check:
    get:
      tags: [Credit]
      summary: Check credit availability
      security: [{ BearerAuth: [] }]
      parameters:
        - name: vendor_id
          in: query
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: Credit info
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data: { $ref: '#/components/schemas/CreditInfo' }

  /credit/apply:
    post:
      tags: [Credit]
      summary: Apply credit to order
      security: [{ BearerAuth: [] }]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [order_id, amount]
              properties:
                order_id: { type: string, format: uuid }
                amount: { type: number }
      responses:
        '200': { description: Credit applied }

  # ── QUICK ORDER LISTS ──
  /lists:
    get:
      tags: [QuickOrderLists]
      summary: Get all quick order lists
      security: [{ BearerAuth: [] }]
      responses:
        '200':
          description: Lists
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      lists: { type: array, items: { $ref: '#/components/schemas/QuickOrderList' } }

  /lists/{id}/order:
    post:
      tags: [QuickOrderLists]
      summary: Order from a quick order list
      security: [{ BearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                items:
                  type: array
                  items:
                    type: object
                    properties:
                      product_id: { type: string, format: uuid }
                      quantity: { type: integer }
      responses:
        '201': { description: Order created from list }

  # ── SERVICEABILITY ──
  /serviceability/check:
    get:
      tags: [Serviceability]
      summary: Check pincode serviceability
      parameters:
        - name: pincode
          in: query
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Serviceability result
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  data:
                    type: object
                    properties:
                      serviceable: { type: boolean }
                      vendor_count: { type: integer }
```
