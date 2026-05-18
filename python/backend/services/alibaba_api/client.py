from .base import AlibabaBaseClient
from .image import AlibabaImageMixin
from .video import AlibabaVideoMixin

class AlibabaAPIClient(AlibabaBaseClient, AlibabaImageMixin, AlibabaVideoMixin):
    """
    Cliente compuesto para la API de Alibaba Model Studio (DashScope).
    Hereda capacidades de inicialización (base), manejo de imágenes y de video.
    """
    pass

# Instancia singleton para usar a lo largo de la app
alibaba_client = AlibabaAPIClient()