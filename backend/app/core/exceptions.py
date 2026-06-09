from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


class SGOException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class NotFoundError(SGOException):
    def __init__(self, resource: str = "Recurso"):
        super().__init__(status.HTTP_404_NOT_FOUND, f"{resource} não encontrado.")


class ForbiddenError(SGOException):
    def __init__(self, detail: str = "Sem permissão para esta ação."):
        super().__init__(status.HTTP_403_FORBIDDEN, detail)


class ConflictError(SGOException):
    def __init__(self, detail: str = "Conflito de dados."):
        super().__init__(status.HTTP_409_CONFLICT, detail)


class BadRequestError(SGOException):
    def __init__(self, detail: str = "Requisição inválida."):
        super().__init__(status.HTTP_400_BAD_REQUEST, detail)


async def sgo_exception_handler(request: Request, exc: SGOException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"])
        errors.append({"campo": field, "mensagem": error["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Erro de validação.", "erros": errors},
    )
