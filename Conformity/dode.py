import pygame
from random import randint, choice

import math

radius_ = 10

black = (0,0,0)
white = (255,255,255)
red = (255,0,0)
green = (0,255,0)
blue = (0,0,255)

class Dode:
    def __init__(self, x: int, y: int, color: tuple, radius = radius_, speed = 1) -> None:
        self.x = x
        self.y = y
        self.color = color
        self.radius = radius
        self.speed = speed
        self.target_x = x
        self.target_y = y
        self.wait_time = -1
        self.bump_time = -1
    
    def draw(self, surface):
        pygame.draw.circle(surface, self.color, (self.x, self.y), self.radius)

    def move(self):
        distance = math.sqrt((self.target_x-self.x) ** 2 + (self.target_y- self.y) ** 2)
        if distance <= 0:
            distance = 1
        if distance <= self.speed:
            self.x = self.target_x
            self.y = self.target_y
        dx = (self.target_x - self.x) / distance
        dy = (self.target_y - self.y) / distance

        self.x += (dx * self.speed)
        self.y += (dy * self.speed)
        if self.bump_time > 0:
            self.bump_time -= 1
    
    def wait(self, time):
        self.wait_time = time * 60

    def move_to(self, new_x, new_y):
        self.target_x = new_x
        self.target_y = new_y
    
    def color_change(self, r, g, b):
        if self.color[0]+r < 0:
            new_r = 0
        elif self.color[0]+r > 255:
            new_r = 255
        else:
            new_r = self.color[0] + r

        if self.color[1]+g < 0:
            new_g = 0
        elif self.color[1]+g > 255:
            new_g = 255
        else:
            new_g = self.color[1] + g

        if self.color[2]+b < 0:
            new_b = 0
        elif self.color[2]+b > 255:
            new_b = 255
        else:
            new_b = self.color[2] + b

        self.color = (new_r, new_g, new_b)
    
    def bump(self, other: "Dode"):
        if self.bump_time > 0 or other.bump_time > 0:
            return
        if self.x - self.radius <= other.x + other.radius and self.x + self.radius >= other.x - other.radius and self.y - self.radius <= other.y + other.radius and self.y + self.radius >= other.y - other.radius:

            self.color = (255, 165, 0)
            self.wait(0)
            self.bump_time = 4 * 60
            
            other.color = (255, 165, 0)
            other.wait(0)
            other.bump_time = 4 * 60



def make_computer(amount: int, game_width: int, game_height: int, radius= radius_):
    return[Dode (randint(0+radius, game_width-radius), randint(0+radius, game_height-radius), choice([red, green, blue]), radius = radius) for comp in range(amount)]