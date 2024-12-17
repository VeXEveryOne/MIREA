package com.example.demo.controller;

import main.java.com.example.demo.controller.Controller;
import main.java.com.example.demo.controller.GetMapping;
import main.java.com.example.demo.controller.PostMapping;
import main.java.com.example.demo.controller.RequestParam;
import org.springframework.ui.Model;

import java.security.Principal;

@Controller
public class HomeController {

    @GetMapping("/home")
    public String showHomePage(Model model, Principal principal) {
        model.addAttribute("username", principal.getName());
        return "home";
    }

    @PostMapping("/home")
    public String handleVote(@RequestParam String option, Model model) {
        model.addAttribute("voteResult", "Вы проголосовали за: " + option);
        return "home";
    }
}
