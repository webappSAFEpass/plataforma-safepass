from pydantic import BaseModel


class PublicStatsOut(BaseModel):
    active_users: int
    providers: int
    benefits: int
    savings_cents: int


class AdminDashboardOut(BaseModel):
    active_users: int
    providers: int
    companies: int
    active_subscriptions: int
    total_reviews: int
    pending_reviews: int
    total_referrals: int
    new_referrals: int
