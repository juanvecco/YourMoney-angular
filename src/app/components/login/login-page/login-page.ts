import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login-page',
    templateUrl: './login-page.html',
    styleUrls: ['./login-page.css']
})
export class LoginPageComponent {
    constructor(private router: Router) { }

    navegarPara(rota: string) {
        this.router.navigate([rota]);
    }
}