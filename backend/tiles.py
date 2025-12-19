from typing import List
from .models import Tile, Suit

def generate_tiles() -> List[Tile]:
    """
    Generates a simplified list of Mahjong tiles (Wan, Tong, Tiao, 1-9).
    """
    tiles = []
    
    # Wan (Characters / 万)
    for i in range(1, 10):
        tiles.append(Tile(
            id=f"{i}wan",
            suit=Suit.MAN,
            rank=i,
            name_cn=f"{i}万",
            name_en=f"{i} Characters",
            image_url=f"/tiles/{i}wan.jpg"
        ))
        
    # Tong (Dots/Circles / 筒)
    for i in range(1, 10):
        tiles.append(Tile(
            id=f"{i}tong",
            suit=Suit.PIN,
            rank=i,
            name_cn=f"{i}筒",
            name_en=f"{i} Dots",
            image_url=f"/tiles/{i}tong.jpg"
        ))
        
    # Tiao (Bamboo / 条)
    for i in range(1, 10):
        tiles.append(Tile(
            id=f"{i}tiao",
            suit=Suit.SOU,
            rank=i,
            name_cn=f"{i}条",
            name_en=f"{i} Bamboo",
            image_url=f"/tiles/{i}tiao.jpg"
        ))
    
    return tiles

ALL_TILES = generate_tiles()

