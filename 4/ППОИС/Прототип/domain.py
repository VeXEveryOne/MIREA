"""Pure domain rules; Decimal money, deterministic offers, explicit outcome semantics."""
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_CEILING
from typing import Iterable


class DomainError(ValueError):
    pass


def number(value, name, minimum=Decimal(0), strictly_positive=False):
    try:
        result = Decimal(str(value))
    except Exception as e:
        raise DomainError(f'{name}: ожидается число') from e
    if not result.is_finite() or result < minimum or (strictly_positive and result == 0):
        raise DomainError(f'{name}: недопустимое значение')
    return result


@dataclass(frozen=True)
class Component:
    id: str
    group_id: str
    sku: str
    role: str
    mass_kg: Decimal
    socket: str | None = None
    memory_type: str | None = None
    power_w: int | None = None


@dataclass(frozen=True)
class Offer:
    id: str
    component_id: str
    supplier_code: str
    unit_price_rub: Decimal
    stock: int
    observed_at: datetime


@dataclass(frozen=True)
class Slot:
    line_no: int
    quantity: int
    group_id: str | None = None
    requested_component_id: str | None = None


@dataclass(frozen=True)
class ResolvedSlot:
    slot: Slot
    component: Component
    offer: Offer


@dataclass(frozen=True)
class PricingPolicy:
    assembly_rub: Decimal = Decimal('2000')
    packaging_rub: Decimal = Decimal('500')
    logistics_rub: Decimal = Decimal('700')
    markup_rate: Decimal = Decimal('.20')
    commission_rate: Decimal = Decimal('.15')
    round_step_rub: Decimal = Decimal('100')
    packaging_mass_kg: Decimal = Decimal('.800')

    def validate(self):
        for name in self.__dataclass_fields__:
            number(getattr(self, name), name, strictly_positive=name == 'round_step_rub')
        if self.markup_rate > 1 or self.commission_rate >= 1:
            raise DomainError('Ставки: наценка не более 1, комиссия менее 1')


def resolve(slots: Iterable[Slot], components: Iterable[Component], offers: Iterable[Offer],
            now: datetime, max_age: timedelta = timedelta(hours=24)) -> list[ResolvedSlot]:
    if now.tzinfo is None or max_age.total_seconds() <= 0:
        raise DomainError('Необходимо время с часовым поясом и положительный срок актуальности')
    catalog = {c.id: c for c in components}; offers = list(offers); result = []; seen = set()
    for slot in slots:
        if type(slot.line_no) is not int or slot.line_no <= 0 or slot.line_no in seen:
            raise DomainError('Номера позиций должны быть положительными и уникальными')
        seen.add(slot.line_no)
        if type(slot.quantity) is not int or slot.quantity <= 0:
            raise DomainError(f'Позиция {slot.line_no}: количество должно быть целым и положительным')
        if bool(slot.group_id) == bool(slot.requested_component_id):
            raise DomainError(f'Позиция {slot.line_no}: задать группу или точную комплектующую')
        candidates = []
        for offer in offers:
            component = catalog.get(offer.component_id)
            if component is None:
                continue
            match = component.group_id == slot.group_id if slot.group_id else component.id == slot.requested_component_id
            if not match or offer.observed_at.tzinfo is None:
                continue
            if offer.stock < slot.quantity or not now-max_age <= offer.observed_at <= now:
                continue
            number(offer.unit_price_rub, 'Цена предложения', strictly_positive=True)
            number(component.mass_kg, 'Масса комплектующей', strictly_positive=True)
            candidates.append((offer.unit_price_rub, offer.supplier_code, offer.id, component, offer))
        if not candidates:
            raise DomainError(f'Позиция {slot.line_no}: нет актуального предложения с достаточным остатком')
        _, _, _, component, offer = min(candidates, key=lambda x:x[:3])
        result.append(ResolvedSlot(slot, component, offer))
    if not result:
        raise DomainError('Состав пуст')
    return result


def check_compatibility(resolved: list[ResolvedSlot]) -> list[str]:
    errors = []; roles = {}
    for row in resolved:
        roles.setdefault(row.component.role, []).append(row)
    for role in ('CPU', 'BOARD', 'CASE', 'PSU'):
        if sum(r.slot.quantity for r in roles.get(role, [])) != 1:
            errors.append(f'{role}: требуется ровно одна комплектующая')
    for role in ('RAM', 'SSD'):
        if not roles.get(role): errors.append(f'{role}: отсутствует обязательная позиция')
    if errors: return errors
    cpu, board, psu = (roles[x][0].component for x in ('CPU','BOARD','PSU'))
    if not cpu.socket or not board.socket or cpu.socket != board.socket:
        errors.append('Сокеты процессора и платы не совпадают либо не заданы')
    if not board.memory_type or any(r.component.memory_type != board.memory_type for r in roles['RAM']):
        errors.append('Тип памяти не соответствует плате')
    consumers = [r for r in resolved if r.component.role not in ('PSU','CASE')]
    if psu.power_w is None or any(r.component.power_w is None for r in consumers):
        errors.append('Не заданы мощности потребителей или блока питания')
    elif psu.power_w < Decimal('1.30') * sum(r.slot.quantity*r.component.power_w for r in consumers):
        errors.append('Недостаточная мощность блока питания при запасе 30%')
    return errors


def calculate(resolved: list[ResolvedSlot], policy: PricingPolicy):
    policy.validate()
    errors = check_compatibility(resolved)
    if errors: raise DomainError('; '.join(errors))
    component_cost = sum((r.slot.quantity*r.offer.unit_price_rub for r in resolved), Decimal(0))
    component_mass = sum((r.slot.quantity*r.component.mass_kg for r in resolved), Decimal(0))
    cost = component_cost+policy.assembly_rub+policy.packaging_rub
    raw_price = (cost*(1+policy.markup_rate)+policy.logistics_rub)/(1-policy.commission_rate)
    price = (raw_price/policy.round_step_rub).to_integral_value(rounding=ROUND_CEILING)*policy.round_step_rub
    return {'component_cost_rub':component_cost, 'cost_rub':cost, 'unrounded_price_rub':raw_price,
            'price_rub':price, 'component_mass_kg':component_mass,
            'mass_kg':component_mass+policy.packaging_mass_kg,
            'rounding_added_rub':price-raw_price}


def may_retry(state: str, confirmed_not_accepted: bool, attempts: int,
              next_check_at: datetime | None, now: datetime, limit: int = 3) -> bool:
    """UNKNOWN/ACCEPTED/PUBLISHED/REJECTED never permit blind resubmission."""
    return (state == 'TEMP_ERROR' and confirmed_not_accepted and 1 <= attempts < limit
            and next_check_at is not None and next_check_at.tzinfo is not None
            and now.tzinfo is not None and next_check_at <= now)
