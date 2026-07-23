export interface JwtPayload {
  sub: string;
  email: string;
  role: 'BUSINESS_OWNER' | 'CUSTOMER';
}
