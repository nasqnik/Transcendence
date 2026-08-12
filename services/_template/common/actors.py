from dataclasses import dataclass
from uuid import UUID

# dataclass is a special class in Python that allows you to create a class with automatically generated methods.
# frozen=True means that the class is immutable, i.e. its attributes cannot be changed after creation.
@dataclass(frozen=True)
class KidActor:
    kid_id: UUID
    username: str

    # property is a special method in Python that allows you to access an attribute as if it were a regular attribute.
    @property
    def pk(self):
        return self.kid_id

    @property
    def is_authenticated(self):
        return True


@dataclass(frozen=True)
class ParentActor:
    user_id: UUID
    username: str
    email: str
    kid_ids: tuple[UUID, ...] = ()

    @property
    def pk(self):
        return self.user_id

    @property
    def is_authenticated(self):
        return True
