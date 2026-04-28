"""
Celery tasks export module.
Toda la lógica de procesamiento está separada en image_task y video_task
para facilitar el mantenimiento.
"""

from worker.image_task import generate_image_task
from worker.video_task import generate_video_task

__all__ = ["generate_image_task", "generate_video_task"]