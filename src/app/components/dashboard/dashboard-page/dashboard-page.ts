import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-dashboard-page',
    templateUrl: './dashboard-page.html',
    styleUrls: ['./dashboard-page.css']
})
export class DashboardPageComponent {
    constructor(private router: Router) { }

    navegarPara(rota: string) {
        this.router.navigate([rota]);
    }
}